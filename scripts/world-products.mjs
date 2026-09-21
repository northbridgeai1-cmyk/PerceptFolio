#!/usr/bin/env node
/* The product index for the World tab: one small file a product word, from the base sets the
   extractor already cached (world/.cache/*.tsv, every OpenStreetMap works, industrial site and
   industrial land with a name).

   Why a static index: "fish" is not an industry layer and not a company, and OpenStreetMap by
   name answers it with fish shops. The 280,000 plants that carry a product or industrial tag
   are too many for one file, so each product word gets its own: world/data/products/fish.json
   holds every plant whose product mentions fish, and index.json lists the words and their
   counts. Pages serves them; the terminal fetches one when a search word matches. No worker, no
   code, no key.

   Rows are [name, operator, lat, lon, country, product]. A word's file is capped, biggest
   names first (operator or Wikidata known), and says so; the count in the index is the whole.
   Run after scripts/world-extract.mjs has filled the cache:  node scripts/world-products.mjs */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const CACHE = path.join(ROOT, 'world', '.cache');
const OUT = path.join(ROOT, 'world', 'data', 'products');
const CAP = 1500;          // rows a word's file may hold
const MIN = 12;            // rows a word needs to earn a file; rarer words go to the live lookup
const STOP = new Set(['and', 'or', 'of', 'the', 'for', 'with', 'from', 'yes', 'no', 'other', 'others', 'misc', 'general', 'various', 'products', 'product', 'production', 'plant', 'plants', 'factory', 'works', 'industrial', 'industry', 'manufacturing', 'manufacture', 'manufacturer', 'company', 'site', 'area', 'land', 'unknown', 'none']);

if (!fs.existsSync(CACHE)) { console.error('no world/.cache; run scripts/world-extract.mjs first'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

const byWord = new Map();   // word -> rows
const seen = new Set();     // name|lat|lon rounded, across files
let total = 0, kept = 0;
for (const f of fs.readdirSync(CACHE)) {
  if (!f.endsWith('.tsv')) continue;
  const lines = fs.readFileSync(path.join(CACHE, f), 'utf8').split('\n');
  const h = lines[0].split('\t');
  const col = n => h.indexOf(n);
  const iName = col('name'), iEn = col('name:en'), iOp = col('operator'), iProd = col('product'), iInd = col('industrial'), iLat = col('@lat'), iLon = col('@lon'), iCc = col('addr:country'), iWd = col('wikidata');
  for (const l of lines.slice(1)) {
    if (!l) continue;
    const c = l.split('\t');
    total++;
    const name = (c[iEn] || c[iName] || '').trim();
    const prod = ((c[iProd] || '') + (c[iInd] ? ';' + c[iInd] : '')).toLowerCase().trim();
    const lat = parseFloat(c[iLat]), lon = parseFloat(c[iLon]);
    if (!name || !prod || !isFinite(lat) || !isFinite(lon)) continue;
    const key = name.toLowerCase() + '|' + lat.toFixed(2) + '|' + lon.toFixed(2);
    if (seen.has(key)) continue;
    seen.add(key);
    kept++;
    const row = [name, (c[iOp] || '').trim(), Math.round(lat * 1e4) / 1e4, Math.round(lon * 1e4) / 1e4, (c[iCc] || '').trim().toUpperCase().slice(0, 2), prod.replace(/_/g, ' ').slice(0, 80)];
    row.w = !!(c[iWd] || c[iOp]);
    const words = new Set(prod.replace(/[_;,/|()]+/g, ' ').split(/\s+/).map(w => w.replace(/[^a-z0-9\-]/g, '')).filter(w => w.length >= 3 && !STOP.has(w)));
    for (const w of words) { if (!byWord.has(w)) byWord.set(w, []); byWord.get(w).push(row); }
  }
}

/* Old files go, so a word that vanished from the data vanishes from the index. */
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.json')) fs.unlinkSync(path.join(OUT, f));

const index = { generatedAt: new Date().toISOString(), source: 'OpenStreetMap contributors (ODbL), via the base sets in world/.cache', cap: CAP, words: {} };
let files = 0, bytes = 0;
for (const [w, rows] of [...byWord.entries()].sort((a, b) => b[1].length - a[1].length)) {
  if (rows.length < MIN) continue;
  const sorted = rows.slice().sort((a, b) => (b.w - a.w) || a[0].localeCompare(b[0]));
  const out = { word: w, count: rows.length, capped: rows.length > CAP, rows: sorted.slice(0, CAP).map(r => r.slice(0, 6)) };
  const file = path.join(OUT, w + '.json');
  const text = JSON.stringify(out);
  fs.writeFileSync(file, text);
  index.words[w] = rows.length;
  files++; bytes += text.length;
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));
console.log(`${total} base rows, ${kept} named plants with a product, ${files} product words with at least ${MIN} plants, ${(bytes / 1e6).toFixed(1)} MB of files`);
for (const w of ['fish', 'seafood', 'food', 'beer', 'semiconductor', 'furniture', 'glass', 'paper', 'textile', 'toys']) if (index.words[w]) console.log('  ' + w + ': ' + index.words[w]);
