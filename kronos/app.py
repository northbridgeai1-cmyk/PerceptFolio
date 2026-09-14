"""Kronos inference service for PerceptFolio, on Modal.

Loads the open Kronos K-line foundation model (shiyu-coder/Kronos) once per container and answers
POST /forecast with a predicted daily path. The worker calls it with a service token; the terminal
never calls it directly. Deploy:

    pip install modal && modal setup
    modal deploy kronos/app.py            # prints the endpoint URL
    npx wrangler secret put KRONOS_URL -c worker.wrangler.toml     # paste that URL
    npx wrangler secret put KRONOS_TOKEN -c worker.wrangler.toml   # any long random string
    modal secret create kronos-token KRONOS_TOKEN=<the same string>

Output is a model's continuation of a price series. It is recorded and marked like every other
call; it is never a recommendation.
"""
import modal

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git")
    .pip_install("torch==2.4.1", "pandas==2.2.2", "numpy==1.26.4", "huggingface_hub==0.25.2", "einops", "safetensors", "fastapi[standard]")
    .run_commands("git clone --depth 1 https://github.com/shiyu-coder/Kronos.git /kronos")
    .env({"PYTHONPATH": "/kronos"})
)
app = modal.App("perceptfolio-kronos", image=image)
MODEL = "NeoQuasar/Kronos-small"
TOKENIZER = "NeoQuasar/Kronos-Tokenizer-base"


@app.cls(gpu="T4", scaledown_window=300, secrets=[modal.Secret.from_name("kronos-token")])
class Forecaster:
    @modal.enter()
    def load(self):
        from model import Kronos, KronosTokenizer, KronosPredictor  # from the cloned repo
        self.tok = KronosTokenizer.from_pretrained(TOKENIZER)
        self.model = Kronos.from_pretrained(MODEL)
        self.pred = KronosPredictor(self.model, self.tok, device="cuda:0", max_context=512)

    @modal.method()
    def forecast(self, candles: list, horizon: int, samples: int = 8) -> dict:
        import pandas as pd
        import numpy as np
        df = pd.DataFrame(candles)[["open", "high", "low", "close", "volume"]].astype(float)
        df["amount"] = df["close"] * df["volume"]
        ts = pd.to_datetime([c["t"] for c in candles], unit="s")
        x = df.tail(400)
        x_ts = pd.Series(ts[-len(x):])
        last = x_ts.iloc[-1]
        y_ts = pd.Series(pd.bdate_range(start=last + pd.Timedelta(days=1), periods=horizon))
        paths = []
        for _ in range(samples):
            out = self.pred.predict(df=x.reset_index(drop=True), x_timestamp=x_ts.reset_index(drop=True), y_timestamp=y_ts,
                                    pred_len=horizon, T=1.0, top_p=0.9, sample_count=1)
            paths.append(out["close"].to_numpy(dtype=float))
        arr = np.vstack(paths)
        return {
            "horizon": horizon,
            "dates": [d.strftime("%Y-%m-%d") for d in y_ts],
            "path": np.median(arr, axis=0).round(4).tolist(),
            "lo": np.percentile(arr, 10, axis=0).round(4).tolist(),
            "hi": np.percentile(arr, 90, axis=0).round(4).tolist(),
            "samples": samples, "model": MODEL,
        }


@app.function(secrets=[modal.Secret.from_name("kronos-token")])
@modal.fastapi_endpoint(method="POST")
def forecast(body: dict, request: "fastapi.Request" = None):  # noqa: F821
    import os
    from fastapi import HTTPException
    token = (request.headers.get("authorization") or "").replace("Bearer ", "") if request else ""
    if not os.environ.get("KRONOS_TOKEN") or token != os.environ["KRONOS_TOKEN"]:
        raise HTTPException(status_code=401, detail="bad token")
    candles = body.get("candles") or []
    horizon = int(body.get("horizon") or 30)
    if len(candles) < 60 or horizon < 5 or horizon > 180:
        raise HTTPException(status_code=400, detail="need at least 60 candles and a horizon of 5 to 180 days")
    return Forecaster().forecast.remote(candles, horizon)
