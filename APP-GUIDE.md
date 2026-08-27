# Turning PerceptFolio into an app

Two stages. Stage 1 is done and costs nothing. Stage 2 is optional, costs $25 once, and takes about
three weeks of calendar time (mostly waiting).

---

## Stage 1 — The installable app (done, free)

These files are already in place:

| File | What it does |
|---|---|
| `manifest.json` | Name, colours, icons, and the fact that it opens without browser chrome |
| `sw.js` | Service worker — caches the app so it opens offline |
| `icon.svg` | App icon |
| `icon-maskable.svg` | Android version, padded so it isn't clipped into a circle |

### Deploy it

1. Put all the files (`index.html`, `manifest.json`, `sw.js`, `icon.svg`, `icon-maskable.svg`,
   `favicon.svg`) in a GitHub repo.
2. Repo → **Settings** → **Pages** → Source: `main` branch, `/ (root)` → **Save**.
3. Wait ~1 minute. Your URL will be `https://<your-username>.github.io/<repo-name>/`.

**HTTPS is mandatory.** Service workers and install prompts refuse to run over plain HTTP. GitHub
Pages gives you HTTPS automatically, so this is handled — but it does mean you can't test the install
flow by double-clicking `index.html` on your desktop. Opening it via `file://` skips the service
worker entirely (the code checks for this and degrades quietly).

### Install it

- **Android / Chrome / Edge desktop** — open the URL, then go to **Settings → Install PerceptFolio**
  inside the app. The button only appears when the browser says installing is possible.
- **iPhone / iPad** — you must use **Safari**. Chrome on iOS cannot install web apps, it's an Apple
  restriction, not a bug. Tap **Share** → scroll → **Add to Home Screen**. The Settings tab shows
  these instructions automatically when it detects iOS, since there's no API to trigger it for you.

### Why installing actually matters on iPhone

Safari deletes localStorage for any site you haven't opened in **7 days**. Your entire portfolio
lives in localStorage. Web apps added to the home screen are exempt from this — they track their own
usage and their first-party data isn't purged. So on iOS, installing isn't cosmetic, it's what keeps
your data from silently vanishing after a week away.

This does **not** make your data safe. Read the warning at the bottom of this file.

### When you change the app

Edit `sw.js` and bump the version string:

```js
const CACHE_VERSION = 'perceptfolio-v2';   // was v1
```

Without this, installed copies keep serving the old cached `index.html`. Navigation requests are
network-first so most updates land anyway, but bumping the version is what reliably clears out old
icons and the cached Chart.js bundle.

### Optional: PNG icons

The manifest points at SVG icons, which Chrome accepts. Some Android launchers and the Play Store
packaging step in Stage 2 prefer PNG. To upgrade:

1. Open `icon.svg` and `icon-maskable.svg` in any converter (or your OS preview → Export).
2. Export at **192×192** and **512×512**, giving you four files:
   `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`.
3. Replace the `icons` array in `manifest.json` with:

```json
"icons": [
  { "src": "./icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
  { "src": "./icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
  { "src": "./icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
  { "src": "./icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
]
```

4. Add the four PNG filenames to the `SHELL` array in `sw.js` and bump `CACHE_VERSION`.

---

## Stage 2 — Google Play ($25 one-time)

You're wrapping the PWA as a **Trusted Web Activity** (TWA) — a real Android app that renders your
site full-screen with no browser UI. Google actively supports this pattern, unlike Apple.

### 1. Create a Play Console account — $25, paid once

<https://play.google.com/console> — one-time $25 registration fee, no annual renewal.

**Choose "Organization" if you have a registered business entity.** This matters enormously — see
step 4. If NorthBridge is a registered entity, register the account under it, not under your personal
name.

### 2. Generate the Android package

Install Bubblewrap (Google's official TWA tool). Needs Node.js and a JDK.

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://<your-username>.github.io/<repo-name>/manifest.json
bubblewrap build
```

It asks for a package name — use reverse-domain form, e.g. `ai.northbridge.perceptfolio`. This is
permanent and cannot be changed after your first upload. It outputs `app-release-bundle.aab`, which
is what you upload.

Bubblewrap generates a **signing keystore**. Back it up somewhere you will not lose it. Lose that
file and you can never update the app again under the same listing — you'd have to publish a new one
and every user would have to reinstall.

### 3. Verify you own the site (Digital Asset Links)

Without this, your app opens with a browser address bar visible, which looks broken.

Bubblewrap prints an `assetlinks.json`. Put it at:

```
/.well-known/assetlinks.json
```

on your GitHub Pages site, so it resolves at
`https://<your-username>.github.io/<repo-name>/.well-known/assetlinks.json`.

> **Note:** on a project-subpath GitHub Pages site, Android looks for `assetlinks.json` at the
> **domain root**, not your subpath. Since you don't control the root of `github.io`, this is the
> point where a real custom domain (e.g. `perceptfolio.com`) stops being optional. Buy the domain,
> point it at GitHub Pages, and host `assetlinks.json` at its root.

### 4. The 12 testers / 14 days rule

If your Play account is a **personal** account created after 13 November 2023, Google requires a
closed test with **at least 12 real testers, opted in continuously for 14 days**, before you can
apply for production access.

- The 14 days start only once the release is approved **and** 12 testers have opted in.
- They must be 12 distinct Google accounts on real devices. Emulators and accounts you batch-create
  don't count.
- **Organization accounts registered to a legal business entity are exempt from this entirely.**

That exemption is the single biggest reason to register the account under NorthBridge rather than
your own name.

### 5. Store listing

You'll need: app name, short description (80 chars), full description (4000), a 512×512 icon, a
1024×500 feature graphic, and at least two phone screenshots. Plus a privacy policy URL — required
for all apps.

Your privacy policy is unusually easy to write honestly: the app has no server, collects nothing,
transmits nothing except your own Finnhub API calls, and stores everything in the browser on the
user's device.

### 6. Financial app declarations

Play has a **Financial Features** declaration section. PerceptFolio does not handle payments, hold
funds, or execute trades, so most of it won't apply — but answer it, don't skip it. Misdeclaring is a
faster route to suspension than declaring accurately.

---

## Why not the Apple App Store

Apple's **Guideline 4.2 (Minimum Functionality)** rejects apps that are essentially web wrappers.
A webview shell around a site is precisely the pattern reviewers bounce. To pass you'd need genuine
native behaviour — push notifications, native navigation, real offline handling — none of which you
currently need for the app to be good.

Cost is $99/year, renewing, versus Google's $25 once. My honest read: skip Apple. iPhone users can
install the PWA from Safari in three taps and get an experience that is nearly identical. Revisit
only if enough people ask that the $99 and the rework are obviously worth it.

---

## The thing none of this fixes

**Every account's data lives in localStorage, in one browser, on one device.**

- Clear your browser data and it's all gone.
- It does not sync between your phone and your laptop. They are separate, unrelated copies.
- There is no backup unless you make one.
- Installing as a PWA protects against Safari's 7-day eviction. It protects against nothing else.

**Use Settings → Export regularly**, and keep the JSON somewhere real. That file is your only
recovery path.

If PerceptFolio ever becomes something other people genuinely depend on, this is the problem to
solve — not distribution. Real multi-device sync needs a backend and an account system, which is a
different project with a different budget. Packaging it as an app makes it feel more permanent than
it actually is, and that gap is worth keeping in mind.
