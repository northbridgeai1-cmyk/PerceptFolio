"""Kronos inference service for PerceptFolio, on Modal.

Loads the open Kronos K-line foundation model (shiyu-coder/Kronos) once per container and answers
POST / on the "web" endpoint (…-perceptfolio-kronos-web.modal.run) with a predicted daily path. The worker calls it with a service token; the terminal
never calls it directly. Deploy:

    bash kronos/deploy.sh                 # does all of the below, then proves the round trip

    modal deploy kronos/app.py            # prints the endpoint URL
    npx wrangler secret put KRONOS_URL -c worker.wrangler.toml     # paste that URL
    npx wrangler secret put KRONOS_TOKEN -c worker.wrangler.toml   # any long random string
    modal secret create kronos-token KRONOS_TOKEN=<the same string>

Output is a model's continuation of a price series. It is recorded and marked like every other
call; it is never a recommendation.

CPU by default. Modal asks for a payment method before it will run a GPU function, even inside
the free credit, and Kronos-small (25M parameters) forecasts a month in well under a minute on a
few CPU cores; the worker caches each answer for a day, so nobody waits twice. To use a T4 once a
card is on file, deploy with KRONOS_GPU=T4 in the environment.
"""
import os
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


GPU = os.environ.get("KRONOS_GPU") or None          # read at deploy time on your machine


@app.cls(gpu=GPU, cpu=4.0, memory=8192, timeout=600, scaledown_window=300, secrets=[modal.Secret.from_name("kronos-token")])
class Forecaster:
    @modal.enter()
    def load(self):
        import torch
        from model import Kronos, KronosTokenizer, KronosPredictor  # from the cloned repo
        device = "cuda:0" if torch.cuda.is_available() else "cpu"
        torch.set_num_threads(4)
        self.tok = KronosTokenizer.from_pretrained(TOKENIZER)
        self.model = Kronos.from_pretrained(MODEL)
        self.pred = KronosPredictor(self.model, self.tok, device=device, max_context=512)
        self.device = device

    @modal.method()
    def forecast(self, candles: list, horizon: int, samples: int = 8) -> dict:
        import pandas as pd
        import numpy as np
        if self.device == "cpu":
            samples = min(samples, 4)
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
            "samples": samples, "model": MODEL, "device": self.device,
        }


@app.function(secrets=[modal.Secret.from_name("kronos-token")], timeout=600)
@modal.asgi_app()
def web():
    """POST / with {"candles": [...], "horizon": n} and Authorization: Bearer <KRONOS_TOKEN>.
    A FastAPI app built inside the container, so the request object and its headers are real;
    a bare endpoint with a string-annotated Request parameter received None and refused everyone."""
    import os
    from fastapi import FastAPI, HTTPException, Request

    api = FastAPI()

    @api.post("/")
    async def forecast(request: Request):
        token = (request.headers.get("authorization") or "").replace("Bearer ", "").strip()
        expected = os.environ.get("KRONOS_TOKEN", "")
        if not expected or token != expected:
            raise HTTPException(status_code=401, detail="bad token")
        body = await request.json()
        candles = body.get("candles") or []
        horizon = int(body.get("horizon") or 30)
        if len(candles) < 60 or horizon < 5 or horizon > 180:
            raise HTTPException(status_code=400, detail="need at least 60 candles and a horizon of 5 to 180 days")
        return Forecaster().forecast.remote(candles, horizon)

    return api
