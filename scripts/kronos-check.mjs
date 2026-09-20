#!/usr/bin/env node
/* Proves the Kronos wiring from the outside: the Worker's /kronos answers a forecast for SPY.
   Uses a live access code from KV (never printed) because the route is code-gated. Run after
   kronos/deploy.sh, or any time you want to know whether the Model view will work. */
import { execSync } from 'node:child_process';
const W = 'https://crimson-hat-6ad9.northbridgeai1.workers.dev';
const ns = '71ba2a59c5a746818a4d2446d3f75ac4';
let codes = [];
try { codes = JSON.parse(execSync(`npx wrangler kv key list --remote --namespace-id ${ns} --prefix code:`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString()).map(k => k.name.slice(5)); } catch { console.log('could not list codes (wrangler not logged in?)'); process.exit(1); }
let live = null;
for (const c of codes) { const j = await (await fetch(`${W}/status?code=${encodeURIComponent(c)}`)).json(); if (j.known && j.active) { live = c; break; } }
if (!live) { console.log('no live code in KV to test with'); process.exit(1); }
const t0 = Date.now();
const r = await fetch(`${W}/kronos`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://perceptfolio.com' }, body: JSON.stringify({ code: live, symbol: 'SPY', horizon: 20 }) });
const j = await r.json().catch(() => ({}));
const secs = ((Date.now() - t0) / 1000).toFixed(1);
if (r.status === 200 && Array.isArray(j.path)) console.log(`Kronos answers: ${r.status} in ${secs}s, a ${j.path.length}-step path for SPY from ${j.last} (${j.model || 'model'}). The Model view works.`);
else if (r.status === 503) console.log(`Kronos is not configured on the Worker yet (${secs}s): ${j.error || ''}`);
else console.log(`unexpected: ${r.status} in ${secs}s ${JSON.stringify(j).slice(0, 200)}`);
process.exit(r.status === 200 ? 0 : 1);
