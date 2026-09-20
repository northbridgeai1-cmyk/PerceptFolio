#!/usr/bin/env node
/* world-extract: build the bundled plant layers for the terminal's World view.

   Usage
     node scripts/world-extract.mjs                    every industry in world/catalog.mjs
     node scripts/world-extract.mjs --only=semiconductors,batteries
     node scripts/world-extract.mjs --force            redo layers younger than 7 days
     node scripts/world-extract.mjs --source=wikidata  one source only (or --source=osm)
     node scripts/world-extract.mjs --index            rewrite index.json from what is on disk

   Two sources, one shape.
     Wikidata (CC0): the typed classes in the catalogue (a semiconductor fabrication plant, an oil
       refinery, a shipyard) with coordinates, plus every placed factory or industrial plant whose
       owner, operator or maker is one of the industry's operators. Owner links come with the
       owner's ticker when Wikidata has it.
     OpenStreetMap (ODbL), through the public Overpass mirrors the way God's Eye View does it: an
       honest User-Agent, mirror rotation, a 200 whose body is a runtime error treated as a failure.
       The shape is dictated by what the mirrors can answer: a tag selector (product=..., plant:source=)
       in seconds worldwide, a name regex over man_made=works not at all. So the two base sets, every
       named works and every named industrial=* object, are pulled once as CSV with no regex, cached
       a month, and every industry's operator list is matched locally.
   Why bundle at all: the mirrors are a shared volunteer resource. Asking on every terminal open
   would be slow for the subscriber and rude to the mirror. So the layers are extracted here,
   occasionally, and shipped as static JSON; the Worker's live /world route serves only the
   free-text company search.

   What comes out: world/data/<industry>.json, compact features with provenance (which source
   answered, the date, whether a cap was hit), and world/data/index.json, the manifest the terminal
   reads. A source that fails leaves the other source's features in place and says so in the file. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import { INDUSTRIES, operatorRegex } from '../world/catalog.mjs';

/* A plain https POST. Node's fetch abandons a request whose response headers take more than five
   minutes to arrive (UND_ERR_HEADERS_TIMEOUT), and Overpass sends nothing until a query is done,
   so a six-minute pull can never finish through fetch. This waits as long as it is told to. */
function postForm(url, body, timeoutMs, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url); const data = Buffer.from(body);
    const req = https.request({ hostname: u.hostname, path: u.pathname, method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': data.length, 'Connection': 'close', ...headers }, timeout: timeoutMs }, res => {
      const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString('utf8') })); res.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(new Error('timed out')); });
    req.on('error', reject);
    req.end(data);
  });
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'world', 'data');
const NE = JSON.parse(fs.readFileSync(path.join(ROOT, 'world', 'ne110.json'), 'utf8')).countries;
const PLACES = JSON.parse(fs.readFileSync(path.join(ROOT, 'world', 'places.json'), 'utf8')).rows;
const COUNTRY_NAME = {}; for (const c of NE) COUNTRY_NAME[c.cc] = c.name;
/* Countries whose first-level region is what a person says after the city ("Miami, Florida");
   everywhere else the country reads better ("Dresden, Germany"). */
const REGION_CC = new Set(['US', 'CA', 'AU', 'BR', 'MX', 'IN']);
/* The nearest Natural Earth place: the city itself within 15 km, "near" it within 80 km, else
   nothing but the country. Same-country places are preferred so a border town is not named
   after the wrong side. */
function placeOf(lat, lon, cc) {
  const cl = Math.cos(lat * Math.PI / 180); let best = null, bd = Infinity;
  for (const p of PLACES) {
    const dy = p[3] - lat; if (dy > 0.75 || dy < -0.75) continue;
    const dx = (p[4] - lon) * cl; if (dx > 0.75 || dx < -0.75) continue;
    let d = dx * dx + dy * dy; if (cc && p[2] && p[2] !== cc) d *= 4;
    if (d < bd) { bd = d; best = p; }
  }
  if (!best) return '';
  const km = Math.sqrt(bd) * 111;
  if (km > 80) return '';
  const tail = REGION_CC.has(best[2]) && best[1] ? best[1] : (COUNTRY_NAME[best[2]] || best[2]);
  const name = tail && tail !== best[0] ? best[0] + ', ' + tail : best[0];
  return (km > 15 ? 'near ' : '') + name;
}
const UA = 'PerceptFolio-world/1.0 (+https://perceptfolio.com)';

const args = process.argv.slice(2);
const flag = (n) => (args.find(a => a.startsWith('--' + n + '=')) || '').slice(n.length + 3);
const only = flag('only').split(',').filter(Boolean);
const source = flag('source') || 'both';
const force = args.includes('--force');
const MAX_AGE_DAYS = 7;
const CAP = 5000;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

/* ------------------------------------------------------------------ countries (Natural Earth) */
const NE_BOX = NE.map(c => { let W = 180, E = -180, S = 90, N = -90; for (const poly of c.polys) for (const [x, y] of poly[0]) { if (x < W) W = x; if (x > E) E = x; if (y < S) S = y; if (y > N) N = y; } return [W, S, E, N]; });
function inRing(ring, x, y) { let inside = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; } return inside; }
function countryOf(lon, lat) {
  for (let i = 0; i < NE.length; i++) {
    const [W, S, E, N] = NE_BOX[i]; if (lon < W || lon > E || lat < S || lat > N) continue;
    for (const poly of NE[i].polys) { if (!inRing(poly[0], lon, lat)) continue; let hole = false; for (let k = 1; k < poly.length; k++) if (inRing(poly[k], lon, lat)) { hole = true; break; } if (!hole) return NE[i].cc; }
  }
  /* Coasts at 1:110m are coarse: a shipyard on a quay lands in the sea. The nearest coastline
     within ~60 km names the country; further than that stays unplaced rather than guessed. */
  let best = '', bestD = 0.6 * 0.6; const cl = Math.cos(lat * Math.PI / 180);
  for (let i = 0; i < NE.length; i++) {
    const [W, S, E, N] = NE_BOX[i]; if (lon < W - 0.6 || lon > E + 0.6 || lat < S - 0.6 || lat > N + 0.6) continue;
    for (const poly of NE[i].polys) for (const [x, y] of poly[0]) { const dx = (x - lon) * cl, dy = y - lat, d = dx * dx + dy * dy; if (d < bestD) { bestD = d; best = NE[i].cc; } }
  }
  return best;
}

/* ------------------------------------------------------------------ Wikidata */
const WD = 'https://query.wikidata.org/sparql';
async function sparql(query, label) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const t0 = Date.now();
    try {
      const r = await fetch(WD + '?query=' + encodeURIComponent(query), { headers: { 'Accept': 'application/sparql-results+json', 'User-Agent': UA, 'Connection': 'close' }, signal: AbortSignal.timeout(75_000) });
      const secs = ((Date.now() - t0) / 1000).toFixed(0);
      if (r.status === 200) { const j = await r.json(); log(`${label}: ${j.results.bindings.length} rows from Wikidata in ${secs}s`); return j.results.bindings; }
      const text = await r.text();
      log(`${label}: Wikidata ${r.status} after ${secs}s ${text.replace(/\s+/g, ' ').slice(0, 80)}`);
      if (r.status === 429) await sleep(30_000); else if (r.status >= 500) await sleep(15_000); else break;
    } catch (e) { log(`${label}: Wikidata ${e.name === 'TimeoutError' ? 'timed out' : e.message}`); await sleep(10_000); }
  }
  throw new Error('Wikidata did not answer');
}
const SELECT = `SELECT DISTINCT ?p ?pLabel ?coord ?cc ?ownerLabel ?ticker ?site WHERE {
  %BODY%
  ?p wdt:P625 ?coord .
  OPTIONAL { ?p wdt:P17 ?country . ?country wdt:P297 ?cc }
  OPTIONAL { ?p wdt:P856 ?site }
  OPTIONAL { ?p wdt:P127|wdt:P137|wdt:P176 ?owner . OPTIONAL { ?owner p:P414 ?ex . ?ex pq:P249 ?ticker } }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de,fr,es,it,nl,ja,zh,ko,pt,ru". }
} LIMIT 6000`;
async function wikidataFor(ind) {
  const rows = [];
  for (const cls of ind.wikidata || []) {
    rows.push(...await sparql(SELECT.replace('%BODY%', `?p wdt:P31/wdt:P279* wd:${cls} .`), `${ind.id} wikidata ${cls}`));
  }
  const ops = (ind.operators || []).filter(Boolean);
  if (ops.length) {
    /* Factories and industrial plants (with subclasses) whose owner, operator or maker carries one
       of the operator names, or whose parent does. The regex is the same whole-word one OSM gets. */
    const rx = operatorRegex(ops).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const body = `{ ?p wdt:P31/wdt:P279* wd:Q83405 } UNION { ?p wdt:P31/wdt:P279* wd:Q557685 } ${ind.id === 'mining' ? 'UNION { ?p wdt:P31/wdt:P279* wd:Q820477 }' : ''}
  ?p wdt:P127|wdt:P137|wdt:P176 ?org . ?org wdt:P749? ?named . ?named rdfs:label ?ol . FILTER(LANG(?ol) = "en") FILTER(REGEX(?ol, "${rx}", "i"))`;
    rows.push(...await sparql(SELECT.replace('%BODY%', body), `${ind.id} wikidata by owner`));
  }
  return rows.map(b => {
    const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(b.coord?.value || ''); if (!m) return null;
    const lon = +m[1], lat = +m[2]; if (!isFinite(lat) || !isFinite(lon)) return null;
    const qid = (b.p?.value || '').split('/').pop(); const name = b.pLabel?.value || '';
    if (!name || name === qid) return null;
    const f = { i: qid, n: clip(name, 80), la: Math.round(lat * 1e4) / 1e4, lo: Math.round(lon * 1e4) / 1e4, q: qid, s: 'w' };
    if (b.ownerLabel?.value && !/^Q\d+$/.test(b.ownerLabel.value) && b.ownerLabel.value !== name) f.o = clip(b.ownerLabel.value, 60);
    if (b.ticker?.value && /^[A-Z0-9.\-]{1,10}$/.test(b.ticker.value)) f.t = b.ticker.value;
    const cc = (b.cc?.value || '').toUpperCase(); if (/^[A-Z]{2}$/.test(cc)) f.c = cc;
    if (b.site?.value && /^https?:\/\//i.test(b.site.value)) f.w = clip(b.site.value, 120);
    f._tags = 3 + (f.o ? 1 : 0) + (f.w ? 1 : 0) + (f.t ? 1 : 0); f._works = 1;
    return f;
  }).filter(Boolean);
}

/* ------------------------------------------------------------------ OpenStreetMap via Overpass */
/* What the mirrors can and cannot do, measured on 2026-09-20: a tag selector (product=..., plant:source=nuclear)
   answers worldwide in seconds; a name regex over man_made=works does not finish in the 180 s a
   mirror allows, and a bbox does not help because the tags are read before the box is applied. So
   the regex never goes to Overpass. Instead the two base sets (every named man_made=works, every
   named industrial=*) are pulled once as CSV, no regex, cached for a month in world/.cache, and
   every industry's operator list is matched here, locally, in milliseconds. */
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://lz4.overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const CACHE = path.join(ROOT, 'world', '.cache');
const BASE_TTL_DAYS = 30, TAG_TTL_DAYS = 7;
const COLS = ['@type', '@id', '@lat', '@lon', 'name', 'name:en', 'operator', 'product', 'industrial', 'addr:country', 'website', 'wikidata', 'operator:wikidata', 'plant:source', 'resource', 'telecom', 'man_made', 'landuse'];
const CSV_HEAD = `[out:csv(${COLS.map(c => c.startsWith('@') ? '::' + c.slice(1) : '"' + c + '"').join(',')};true;"\t")]`;
/* [name, statement, server timeout in seconds]. Named industrial land is the big one (TSMC's fabs are
   drawn that way, with no works tag) and takes the mirror the longest; it gets the longest budget
   and comes last, so the cheaper sets are on disk before it is attempted. */
const BASE_SETS = [
  ['works-way', 'way["man_made"="works"]["name"]', 900], ['works-node', 'node["man_made"="works"]["name"]', 600], ['works-rel', 'relation["man_made"="works"]["name"]', 600],
  ['industrial-way', 'way["industrial"]["name"]', 1500], ['industrial-node', 'node["industrial"]["name"]', 600], ['industrial-rel', 'relation["industrial"]["name"]', 600],
  ['landuse-way', 'way["landuse"="industrial"]["name"]', 1700], ['landuse-rel', 'relation["landuse"="industrial"]["name"]', 900],
];
const looksLimited = t => /rate_limited|quota of your ip|too many requests/i.test(t);
const looksBroken = t => /runtime error|timed out|out of memory|too busy/i.test(t);
/* This network drops and restores routes minute to minute (IPv4 fails while IPv6 answers, then
   the reverse), so there is no such thing as "the live mirrors for this run". Each pull probes a
   mirror right before using it: a hung mirror costs twelve seconds, not a fifteen-minute wait. */
async function reachable(m) {
  try { const r = await postForm(m, 'data=' + encodeURIComponent('[out:json][timeout:5];node(1);out;'), 12_000, { 'User-Agent': UA }); return r.status === 200; }
  catch (e) { return false; }
}
async function healthyMirrors() { return MIRRORS.slice(); }
/* One CSV query, every live mirror, two rounds. The mirror's own [timeout] is the budget; the
   client waits a little longer so a runtime error arrives as a body, not as a dropped socket. */
async function overpassCsv(mirrors, stmt, label, timeoutS) {
  const ql = `${CSV_HEAD}[timeout:${timeoutS}][maxsize:268435456];${stmt};out center;`;
  for (let round = 0; round < 3; round++) {
    for (const m of mirrors) {
      if (!(await reachable(m))) { log(`${label}: ${m.replace('https://', '').split('/')[0]} unreachable right now`); continue; }
      const t0 = Date.now();
      try {
        const r = await postForm(m, 'data=' + encodeURIComponent(ql), (timeoutS + 60) * 1000, { 'User-Agent': UA });
        const text = r.text; const secs = ((Date.now() - t0) / 1000).toFixed(0); const head = text.slice(0, 3000);
        if (r.status === 200 && !looksLimited(head) && !looksBroken(head) && head.startsWith('@type')) { log(`${label}: ${text.split('\n').length - 2} rows in ${secs}s (${m.replace('https://', '').split('/')[0]})`); return text; }
        log(`${label}: ${looksLimited(head) ? 'rate-limited' : looksBroken(head) ? 'runtime error' : 'refused ' + r.status} after ${secs}s`);
        if (looksLimited(head)) await sleep(60_000);
      } catch (e) { log(`${label}: ${e.code || e.message}`); }
      await sleep(8_000);
    }
    if (round < 2) { log(`${label}: waiting 60s`); await sleep(60_000); }
  }
  return null;
}
function parseCsv(text) {
  const lines = text.split('\n'); const head = lines[0].split('\t'); const rows = [];
  for (let i = 1; i < lines.length; i++) { if (!lines[i]) continue; const cells = lines[i].split('\t'); const o = {}; head.forEach((k, j) => { if (cells[j]) o[k] = cells[j]; }); rows.push(o); }
  return rows;
}
async function cachedCsv(mirrors, name, stmt, ttlDays, timeoutS) {
  fs.mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, name + '.tsv');
  if (fs.existsSync(file) && (Date.now() - fs.statSync(file).mtimeMs) / 86_400_000 < ttlDays) return parseCsv(fs.readFileSync(file, 'utf8'));
  if (!mirrors.length) return null;
  const text = await overpassCsv(mirrors, stmt, name, timeoutS);
  if (text == null) return null;
  fs.writeFileSync(file, text);
  return parseCsv(text);
}
/* The base sets, once per month. A set that cannot be pulled this run is reported and the
   industries carry `partial`; the Wikidata half still ships. */
async function baseRows(mirrors) {
  const rows = []; const missing = [];
  for (const [name, stmt, budget] of BASE_SETS) {
    const r = await cachedCsv(mirrors, 'base-' + name, stmt, BASE_TTL_DAYS, budget);
    /* A loop, not push(...r): the industrial-land set is 350k rows and a spread that size overflows the call stack. */
    if (r) { for (const o of r) { if (name.startsWith('works')) o.man_made = 'works'; if (name.startsWith('landuse')) o.landuse = o.landuse || 'industrial'; rows.push(o); } } else missing.push(name);
  }
  log(`base sets: ${rows.length} named objects${missing.length ? ', missing ' + missing.join(' ') : ''}`);
  return { rows, missing };
}
function rowToFeature(o) {
  const lat = +o['@lat'], lon = +o['@lon']; if (!isFinite(lat) || !isFinite(lon)) return null;
  const name = o['name:en'] || o.name || o.operator || ''; if (!name) return null;
  const f = { i: o['@type'][0] + o['@id'], n: clip(name, 80), la: Math.round(lat * 1e4) / 1e4, lo: Math.round(lon * 1e4) / 1e4, s: 'o' };
  if (o.operator && o.operator !== name) f.o = clip(o.operator, 60);
  const k = o.product || o.industrial || o['plant:source'] || o.resource || (o.telecom === 'data_center' ? 'data centre' : '') || (o.man_made === 'works' ? 'works' : '') || (o.landuse === 'quarry' ? 'mine' : '') || (o.landuse === 'industrial' ? 'industrial land' : o.landuse) || '';
  if (k) f.p = clip(k.replace(/_/g, ' '), 40);
  const cc = (o['addr:country'] || '').toUpperCase().slice(0, 2); if (/^[A-Z]{2}$/.test(cc)) f.c = cc;
  if (o.website && /^https?:\/\//i.test(o.website)) f.w = clip(o.website, 120);
  const q = o.wikidata || o['operator:wikidata']; if (q && /^Q\d+$/.test(q)) f.q = q;
  f._tags = Object.keys(o).length; f._works = o.man_made === 'works' ? 1 : 0;
  return f;
}
async function osmFor(ind, mirrors, base) {
  const out = []; let asked = 0, answered = 0;
  /* The operator list over the cached base sets: whole words, case-insensitive, name or operator. */
  const rx = ind.operators && ind.operators.length ? new RegExp(operatorRegex(ind.operators), 'i') : null;
  if (rx) for (const o of base.rows) { if (rx.test(o.name || '') || rx.test(o['name:en'] || '') || rx.test(o.operator || '')) { const f = rowToFeature(o); if (f) out.push(f); } }
  /* The tag selectors, live and small, cached a week. */
  for (const t of ind.tags || []) {
    asked++;
    const rows = await cachedCsv(mirrors, `tag-${ind.id}-${asked}`, 'nwr' + t, TAG_TTL_DAYS, 120);
    if (rows) { answered++; for (const o of rows) { const f = rowToFeature(o); if (f) out.push(f); } }
  }
  return { features: out, asked, answered, baseMissing: base.missing };
}

/* ------------------------------------------------------------------ merge, dedupe, write */
function finish(feats) {
  for (const f of feats) { if (!f.c) { const cc = countryOf(f.lo, f.la); if (cc) f.c = cc; } const pl = placeOf(f.la, f.lo, f.c); if (pl) f.pl = pl; }
  /* Same name within ~2 km is one plant, whatever the source; keep the better-described copy and
     carry the other's identifiers along so a Wikidata QID or ticker is never lost. */
  const near = (a, b) => Math.abs(a.la - b.la) < 0.02 && Math.abs((a.lo - b.lo) * Math.cos(a.la * Math.PI / 180)) < 0.02;
  const better = (a, b) => a._works > b._works || (a._works === b._works && a._tags > b._tags);
  const groups = new Map();
  for (const f of feats) {
    const key = f.n.toLowerCase().replace(/[^a-z0-9À-￿]+/g, ' ').trim();
    const g = groups.get(key) || []; groups.set(key, g);
    const i = g.findIndex(x => near(x, f));
    if (i < 0) g.push(f);
    else { const keep = better(f, g[i]) ? f : g[i], drop = keep === f ? g[i] : f; for (const k of ['o', 'c', 'w', 'q', 't', 'pl']) if (!keep[k] && drop[k]) keep[k] = drop[k]; if (drop.p && (!keep.p || /^(works|factory|industrial( land)?)$/.test(keep.p))) keep.p = drop.p; if (keep.s !== drop.s) keep.s = 'ow'; keep._tags += drop._tags; g[i] = keep; }
  }
  const out = [...groups.values()].flat().sort((a, b) => (b._tags - a._tags) || a.n.localeCompare(b.n)).slice(0, CAP);
  for (const f of out) { delete f._tags; delete f._works; }
  return out;
}
function writeIndex() {
  const industries = [];
  for (const ind of INDUSTRIES) {
    const file = path.join(OUT, ind.id + '.json');
    let count = 0, asOf = null, saturated = false, partial = false;
    if (fs.existsSync(file)) { const j = JSON.parse(fs.readFileSync(file, 'utf8')); count = j.count; asOf = j.asOf; saturated = !!j.saturated; partial = !!j.partial; }
    industries.push({ id: ind.id, label: ind.label, color: ind.color, keywords: ind.keywords, count, asOf, saturated, partial, file: ind.id + '.json' });
  }
  const countries = {}; for (const c of NE) countries[c.cc] = c.name;
  const index = {
    generatedAt: new Date().toISOString(),
    source: 'OpenStreetMap contributors (ODbL 1.0) and Wikidata (CC0). Community-mapped; incomplete by nature.',
    countries,
    industries,
  };
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));
  /* all.json: every plant across the layers as compact rows [name, operator, lat, lon, country,
     industry, wikidata], one plant once, so the terminal can match a holding's name locally and
     instantly (Nominatim adds what the bundle lacks). About 70 bytes a plant. */
  const seen = new Set(), rows = [];
  for (const ind of INDUSTRIES) {
    const file = path.join(OUT, ind.id + '.json'); if (!fs.existsSync(file)) continue;
    for (const f of JSON.parse(fs.readFileSync(file, 'utf8')).features) { const k = f.i.replace(/^[a-z]+:/, ''); if (seen.has(k)) continue; seen.add(k); rows.push([f.n, f.o || '', f.la, f.lo, f.c || '', ind.id, f.q || '', f.pl || '']); }
  }
  fs.writeFileSync(path.join(OUT, 'all.json'), JSON.stringify({ asOf: new Date().toISOString().slice(0, 10), columns: ['name', 'operator', 'lat', 'lon', 'country', 'industry', 'wikidata', 'place'], rows }));
  return index;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (args.includes('--index')) { const idx = writeIndex(); log('index: ' + idx.industries.map(i => `${i.id}=${i.count}`).join(' ')); return; }
  const todo = INDUSTRIES.filter(i => !only.length || only.includes(i.id));
  const mirrors = source === 'wikidata' ? [] : await healthyMirrors();
  if (mirrors.length) log('mirrors: ' + mirrors.map(m => m.replace('https://', '').split('/')[0]).join(', ') + ' (each probed before use)');
  const base = source === 'wikidata' ? { rows: [], missing: [] } : await baseRows(mirrors);
  for (const ind of todo) {
    const file = path.join(OUT, ind.id + '.json');
    let previous = null;
    if (fs.existsSync(file)) {
      previous = JSON.parse(fs.readFileSync(file, 'utf8'));
      const age = (Date.now() - fs.statSync(file).mtimeMs) / 86_400_000;
      if (!force && age < MAX_AGE_DAYS && !previous.partial) { log(`${ind.id}: kept (${previous.count} plants, extracted ${age.toFixed(1)} days ago; --force to redo)`); continue; }
    }
    log(`${ind.id}: extracting`);
    const feats = []; const prov = { wikidata: 'skipped', osm: 'skipped' };
    if (source !== 'osm') {
      try { const w = await wikidataFor(ind); feats.push(...w); prov.wikidata = `${w.length} rows`; }
      catch (e) { prov.wikidata = 'failed: ' + e.message; log(`${ind.id}: Wikidata failed (${e.message})`); }
    }
    if (source !== 'wikidata') {
      const o = await osmFor(ind, mirrors, base); feats.push(...o.features);
      prov.osm = `${o.answered}/${o.asked} tag selectors answered, base sets ${o.baseMissing.length ? 'missing ' + o.baseMissing.join(' ') : 'complete'}, ${o.features.length} features`;
    }
    /* If a source failed this time, keep its features from the previous file rather than lose them. */
    if (previous && Array.isArray(previous.features)) {
      const wdFailed = /failed/.test(prov.wikidata), osmFailed = /missing|^0\//.test(prov.osm);
      for (const f of previous.features) if ((wdFailed && /w/.test(f.s || '')) || (osmFailed && /o/.test(f.s || ''))) feats.push({ ...f, _tags: 1, _works: 0 });
    }
    const features = finish(feats);
    const byCountry = {}; for (const f of features) byCountry[f.c || '?'] = (byCountry[f.c || '?'] || 0) + 1;
    const partial = /failed/.test(prov.wikidata) || /missing/.test(prov.osm) || (/^(\d+)\/(\d+)/.test(prov.osm) && RegExp.$1 !== RegExp.$2);
    const doc = { id: ind.id, label: ind.label, asOf: new Date().toISOString().slice(0, 10), count: features.length, saturated: features.length >= CAP, partial, provenance: prov, byCountry, features };
    fs.writeFileSync(file, JSON.stringify(doc));
    log(`${ind.id}: wrote ${features.length} plants in ${Object.keys(byCountry).filter(k => k !== '?').length} countries (${prov.wikidata}; osm ${prov.osm}) ${(fs.statSync(file).size / 1024).toFixed(0)} KB${partial ? ' PARTIAL' : ''}`);
    writeIndex();
  }
  const idx = writeIndex();
  log('index: ' + idx.industries.map(i => `${i.id}=${i.count}${i.partial ? '*' : ''}`).join(' '));
}

main().catch(e => { console.error(e); process.exit(1); });
