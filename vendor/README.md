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
