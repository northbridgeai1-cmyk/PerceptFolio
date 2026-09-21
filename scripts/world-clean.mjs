#!/usr/bin/env node
/* Drops the plants that do not belong in an industry layer.

   The extractor matches OpenStreetMap by tag selector and by a name regex, and the regex is what
   let a Bosnian fish plant into "Chips and wafers" (its name contains "chip") and a confectioner
   in (its products include "wafers"). A layer is a claim about an industry, so anything whose
   product or name says food, drink, farming or retail is removed from every layer here; the whole
   bundle (all.json) keeps them, because a holding in Pepsi still wants its plants found.

   Run after scripts/world-extract.mjs, or on its own:  node scripts/world-clean.mjs */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const DATA = path.join(ROOT, 'world', 'data');

/* Product tags and names that mark a plant as food, drink, farming or retail. Words that also
   name industrial things (mill, farm, plant, works) stay out on purpose: Intel's "Jones Farm
   Campus" is a fab. */
const FOOD_PRODUCT = /\b(food|foods|fish|seafood|meat|poultry|slaughter|dairy|milk|cheese|butter|yogh?urt|ice cream|confection\w*|cand(y|ies)|chocolate|cocoa|bak(ery|ing)|bread|pastr(y|ies)|biscuit\w*|cookie\w*|snack\w*|crisps|potato\w*|sugar|flour|grain\w*|rice|noodle\w*|pasta|sauce\w*|spice\w*|coffee|tea|juice\w*|beverage\w*|drinks?|soft drink\w*|soda water|soda pop|water bottling|brew\w*|beer|wine\w*|winery|distillery|distilled spirits|spirits|liquor|vodka|whisky|whiskey|tobacco|cigarette\w*|feed|fodder|pet food|fruit\w*|vegetable\w*|cannery|canning|honey|egg\w*)\b/i;
const FOOD_NAME = /\b(confectioner\w*|cand(y|ies)|chocolatier\w*|bakery|brewery|brewing|winery|distillery|dairy|creamer(y|ies)|seafood|fisheries|fish processing|slaughterhouse|abattoir|snack\w*|foods?|nutrition\w*|beverage\w*|cannery|sugar mill|flour mill|rice mill|coffee roast\w*|frito-lay|pepsico|nestl[eé]|mondel[eē]z|kellogg's|kellogg company|hershey|mars wrigley|unilever food)\b/i;

function offTopic(f) {
  const p = String(f.p || '');
  const n = String(f.n || '') + ' ' + String(f.o || '');
  return FOOD_PRODUCT.test(p) || FOOD_NAME.test(n);
}

const index = JSON.parse(fs.readFileSync(path.join(DATA, 'index.json'), 'utf8'));
let total = 0;
for (const ind of index.industries || []) {
  const file = path.join(DATA, ind.file);
  if (!fs.existsSync(file)) continue;
  const layer = JSON.parse(fs.readFileSync(file, 'utf8'));
  const before = (layer.features || []).length;
  const dropped = (layer.features || []).filter(offTopic);
  layer.features = (layer.features || []).filter(f => !offTopic(f));
  const countries = new Set(layer.features.map(f => f.c).filter(Boolean));
  layer.count = layer.features.length;
  layer.countries = countries.size;
  ind.count = layer.features.length;
  ind.countries = countries.size;
  fs.writeFileSync(file, JSON.stringify(layer));
  total += dropped.length;
  console.log(`${ind.id}: ${before} → ${layer.features.length}` + (dropped.length ? `  dropped ${dropped.length}: ${dropped.slice(0, 4).map(f => f.n).join(' · ')}${dropped.length > 4 ? ' …' : ''}` : ''));
}
index.cleanedAt = new Date().toISOString();
fs.writeFileSync(path.join(DATA, 'index.json'), JSON.stringify(index));
console.log(`dropped ${total} off-topic plants across ${index.industries.length} layers`);
