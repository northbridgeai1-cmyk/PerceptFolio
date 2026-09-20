# vendor/

Third-party code served from this origin instead of a CDN.

## chart-4.4.1.umd.min.js

Chart.js 4.4.1, UMD build, as published by cdnjs.

Verified on 2026-09-02 against the hash cdnjs publishes through its own API
(`api.cdnjs.com/libraries/Chart.js/4.4.1?fields=sri`):

    sha512-CQBWl4fJHWbryGE+Pc7UAxWMUMNMWzWxF4SQo9CgkJIN1kx6djDQZjh3Y8SZ1d+6I+1zze6Z7kHXO7q3UyZAWw==

The terminal previously loaded this from cdnjs with no integrity attribute, which
meant that whatever cdnjs served on any given morning ran with full access to the
page — a portfolio, an API key, and a set of positions.

It is vendored rather than pinned with an `integrity=` attribute because this is an
offline-first PWA. SRI fixes the tampering problem and leaves three others:

  - First load still needs cdnjs reachable. Install the app somewhere with a
    captive portal or a blocked CDN and every chart is missing.
  - cdnjs sees the IP of everyone who opens the terminal.
  - If the pinned file is ever repackaged, SRI fails closed and the charts die
    with a console error most people will never look at.

A file in the repo has none of those failure modes.

### Upgrading

Do it deliberately, not automatically:

    curl -o vendor/chart-<VER>.umd.min.js \
      https://cdnjs.cloudflare.com/ajax/libs/Chart.js/<VER>/chart.umd.min.js

    # confirm it matches what cdnjs publishes before trusting it
    openssl dgst -sha512 -binary vendor/chart-<VER>.umd.min.js | openssl base64 -A
    curl -s "https://api.cdnjs.com/libraries/Chart.js/<VER>?fields=sri"

Then update the <script src> in terminal/index.html, delete the old file, and bump
CACHE_VERSION in sw.js. The version is in the filename so an upgrade cannot be
served from a stale cache.

## cesium/  (CesiumJS 1.145.0, Apache 2.0)

The globe behind the terminal's World view. A pruned copy of the `Build/Cesium` tree from the npm
package `cesium@1.145.0`, verified against the registry's integrity hash before copying:

    sha512-6Azix8b5LPpoVSx8XQ6zPztpluJVmq+CEO3W2rOWxtc6bri6Nc9MvCYhKmTW1LAEwfisV7yzNgfulCXw9842+g==

Kept: `Cesium.js`, `Workers/` (geometry workers, started from blob: URLs that import these files,
which is why both CSPs carry `worker-src 'self' blob:`), `Widgets/` (the credit line's CSS),
`Assets/Textures/NaturalEarthII/` (the public-domain basemap, served from here so no map company
is in the loop) and `Assets/approximateTerrainHeights.json`. The npm package ships no credit logo, so
the terminal sets `CreditDisplay.cesiumCredit` to a text link before building the widget. Dropped: `ThirdParty/` (draco, basis,
splats, zip: only 3D Tiles and glTF need them), the sky box, moon and water textures, and the IAU
tables (only ICRF lighting needs them). cdnjs was not an option: it 403s Cesium's XML tile
manifests, and vendor/README.md above says why a CDN is the wrong place for this anyway.

Cesium ion is never used: `Ion.defaultAccessToken` is set to an empty string before the viewer is
built, and the base layer and terrain are given explicitly, so nothing is requested from
api.cesium.com.

Two one-token patches are applied to `Cesium.js` after copying, and a test pins both:

  - Knockout's global lookup `this||(0,eval)("this")` becomes `this||globalThis`. Under the CSP
    (no `'unsafe-eval'`) the original throws at load and the whole bundle aborts.
  - The worker bootstrap's `typeof CESIUM_WORKERS<"u"` branch is disabled (`!1&&...`), so workers
    are started from `Workers/*.js` as same-origin module workers instead of a blob that
    `importScripts` another blob, which `script-src` forbids. `worker-src 'self'` is then enough.

### Upgrading

    cd /tmp && npm pack cesium@<VER>
    # compare `openssl dgst -sha512 -binary cesium-<VER>.tgz | openssl base64 -A` with
    # `npm view cesium@<VER> dist.integrity` before extracting
    tar -xzf cesium-<VER>.tgz
    # copy the same subset into vendor/cesium/, update the hash above, bump CACHE_VERSION in sw.js
