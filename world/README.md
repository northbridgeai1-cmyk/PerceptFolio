# world/

The terminal's World view: every plant OpenStreetMap and Wikidata know for an industry or a
company, on a globe. Built on the approach of God's Eye View by Bilawal Sidhu
(https://github.com/bilawalsidhu/gods-eye-view, MIT, read at commit 704e0fcc518d): a CesiumJS globe
over public data, infrastructure layers extracted from OpenStreetMap and bundled, a proxied,
bounded, cached Overpass query for the live question, and honest labels about coverage.

What was taken from it and what was not:

- Taken: the globe (CesiumJS, the same engine), the keyless basemap tier, the bundled-extract
  pattern with per-folder provenance, the Overpass proxy pattern (mirror rotation, an honest
  User-Agent, rate-limit and runtime-error detection on 200 bodies, caching, an element cap with a
  `saturated` flag), and the wording "community-mapped, incomplete by nature".
- Not taken: its code (it is a 1,100-file application with its own Node server; this terminal is one
  file with no build step), its TeleGeography cables (CC BY-NC-SA, not for a sold product), the
  Cesium ion and Google 3D tiers (non-commercial or metered), and its live movers (OpenSky is
  non-commercial; adsb.lol and AISStream are fair-use feeds that a sold product should not lean on).

## Files

- `catalog.mjs` — the fifteen industries: label, colour, search keywords, OSM tag selectors, Wikidata
  classes, and the operators whose plants matter to an equity decision. Source, not product.
- `ne110.json` — Natural Earth 1:110m country polygons (public domain), rounded to 0.01°, used to
  stamp a country onto plants that carry none. Served, because the terminal stamps live search
  results with it.
- `data/index.json` — the manifest the terminal reads: per-layer count, date, `partial`, colours,
  keywords, and the country-code table.
- `data/<industry>.json` — the bundled layer. Compact features:
  `i` id (OSM `n|w|r<id>` or Wikidata QID), `n` name, `la`/`lo`, `o` operator or owner, `p` what it
  makes, `c` ISO country, `w` website (http(s) only), `q` Wikidata QID, `t` owner's ticker when
  Wikidata has it, `s` source (`o` OSM, `w` Wikidata, `ow` both). Plus `provenance` (what each source
  answered), `byCountry`, `asOf`, `saturated`, `partial`.
- `../scripts/world-extract.mjs` — regenerates `data/`. Run it occasionally (it keeps layers younger
  than seven days unless `--force`). It pulls the OSM base sets (every named `man_made=works`,
  `industrial=*` and `landuse=industrial` object) once as CSV into `.cache/` (gitignored, kept a month), asks the small
  tag selectors live (kept a week), asks Wikidata per industry, matches every catalogue locally,
  and a source that fails leaves the previous file's features in place and marks the layer
  `partial`.

## Licences

- OpenStreetMap data: © OpenStreetMap contributors, Open Database License (ODbL) 1.0. The bundled
  layers are a derived database and stay under ODbL with attribution; the terminal shows the
  attribution on the globe's credit line and in the aside. Contact-type tags are never extracted.
- Wikidata: CC0.
- Natural Earth (imagery and polygons): public domain.
- CesiumJS: Apache 2.0, vendored under `vendor/cesium` with its licence file.

## What the mirrors can answer (measured 2026-09-20)

A tag selector (`product=...`, `plant:source=nuclear`) answers worldwide in seconds. A name regex
over `man_made=works` does not finish inside the 180 s a mirror allows, and a bbox does not help:
an almost-empty Pacific quadrant took the full timeout too, so the tags are read for the whole
tag-index set before the box is applied. That is why the extractor pulls the base sets with no
regex (51,843 named works ways took 311 s once; named industrial land, the set TSMC's fabs live
in, gets a 1,700 s budget) and matches locally, and why the Worker's live company search uses
Nominatim, OSM's indexed geocoder, rather than Overpass. A plant drawn without a name is in
neither; the aside on the page says so. Node's `fetch` cannot wait more than five minutes for
response headers, so the pulls go through `node:https`.
