# Kronos on Modal

`app.py` serves the Kronos-small K-line model behind a token-checked POST endpoint. The worker's
`/kronos` route fetches two years of daily OHLCV for a symbol, posts it here, and caches the
answer for a day. In the terminal, Projections gains a Model view: the median path and a 10–90%
band, and a button that records the direction as a call on the `kronos` track so it is marked
against the index like everything else.

Operator steps, once: `bash kronos/deploy.sh` from the repo root does all of them (installs the
Modal CLI, opens Modal's sign-in for you to complete, mints the shared token, deploys, stores the
URL and token on the Worker, redeploys it, and proves the route with `scripts/kronos-check.mjs`).
The individual commands are in the docstring at the top of `app.py`. Until `KRONOS_URL` and
`KRONOS_TOKEN` exist on the worker, `/kronos` answers 503 and the panel says the model is not
configured. Cost: a T4 for a few seconds per forecast, scaled to zero between calls.
