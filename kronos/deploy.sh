#!/usr/bin/env bash
# Kronos, end to end, in one command. Run from the repo root:
#
#     bash kronos/deploy.sh
#
# What it does, in order, stopping at the first failure:
#   1. installs the Modal CLI for your user if it is missing
#   2. opens Modal's browser sign-in if this machine has no token yet (the one step that is yours:
#      create or sign in to the Modal account there; the free tier covers this workload)
#   3. mints a random shared token and stores it as the Modal secret `kronos-token`
#   4. deploys kronos/app.py and reads the endpoint URL from Modal
#   5. stores the URL and the same token on the Worker as KRONOS_URL and KRONOS_TOKEN
#   6. redeploys the Worker so /kronos answers, then asks it for a forecast to prove it
#
# Nothing is printed that should not be: the token is written to the two secret stores and never
# echoed. Re-running is safe; every step is idempotent.
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

say "1/6 Modal CLI"
# Modal supports Python 3.9 to 3.13, and its cbor2 6.x dependency is Rust-compiled with no wheel
# for every Mac, so pip asks for a Rust compiler. cbor2 5.x builds without one and Modal accepts
# it. uv runs Modal on 3.13 with that pin in one line and keeps it out of the system Python; a
# plain python3.13/3.12/3.11 works too; failing both, brew installs uv.
MODAL=""
if command -v uv >/dev/null 2>&1; then
  MODAL="uv tool run --python 3.13 --with cbor2<6 modal"
else
  for py in python3.13 python3.12 python3.11 python3.10; do
    if command -v "$py" >/dev/null 2>&1; then "$py" -m pip install --user --quiet "cbor2<6" modal && MODAL="$py -m modal" && break; fi
  done
fi
if [ -z "$MODAL" ] && command -v brew >/dev/null 2>&1; then brew install uv >/dev/null 2>&1 && MODAL="uv tool run --python 3.13 --with cbor2<6 modal"; fi
[ -n "$MODAL" ] || { echo "No supported Python (3.10 to 3.13) and no uv or Homebrew found. Install uv (https://docs.astral.sh/uv/) and run this again."; exit 1; }
$MODAL --version

say "2/6 Modal sign-in"
if [ ! -f "$HOME/.modal.toml" ]; then
  echo "A browser window will open. Sign in (or create the account) and come back here."
  $MODAL setup
fi

say "3/6 the shared token"
TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
if $MODAL secret list 2>/dev/null | grep -q '^kronos-token\b\|kronos-token'; then
  $MODAL secret create kronos-token "KRONOS_TOKEN=$TOKEN" --force >/dev/null
else
  $MODAL secret create kronos-token "KRONOS_TOKEN=$TOKEN" >/dev/null
fi
echo "stored on Modal as kronos-token"

say "4/6 deploy kronos/app.py (first run builds the image and downloads the weights; a few minutes)"
$MODAL deploy kronos/app.py | tee /tmp/kronos-deploy.log | grep -v -i "token" || true
URL="$(grep -o 'https://[a-z0-9.-]*modal\.run[^ ]*' /tmp/kronos-deploy.log | head -1)"
[ -n "$URL" ] || { echo "could not find the endpoint URL in Modal's output; see /tmp/kronos-deploy.log"; exit 1; }
echo "endpoint: $URL"

say "5/6 the Worker's secrets"
printf '%s' "$URL"   | npx wrangler secret put KRONOS_URL   -c worker.wrangler.toml
printf '%s' "$TOKEN" | npx wrangler secret put KRONOS_TOKEN -c worker.wrangler.toml

say "6/6 redeploy the Worker and prove it"
npx wrangler deploy -c worker.wrangler.toml | tail -3
node scripts/kronos-check.mjs
