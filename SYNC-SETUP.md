# Setting up sync between your devices

Time: about 15 minutes, once. Cost: $0.

You're creating a tiny private storage box on Cloudflare that only you can reach. Your phone and your
computer both read and write to it, so they stay in step.

**Do this on a computer, not your phone.** The Cloudflare dashboard is painful on a small screen.

---

## Before you start

Read this once so nothing surprises you later:

- **This is for your own devices only.** Access is protected by a single password (Cloudflare calls
  it a secret) that you'll paste into each device. Anyone who has it can read and overwrite
  everything. That's fine for you and your laptop. Do **not** give it to clients — that needs real
  per-user accounts, which is a different build.
- **It syncs the account you're logged into**, not every account on the device. Your client profiles
  stay local on your computer.
- **It's last-write-wins, not a merge.** More on that at the bottom.

---

## Step 1 — Make a Cloudflare account

1. Go to **dash.cloudflare.com/sign-up**
2. Sign up with your email. Free plan. No card needed.
3. Verify the email they send you.

If you already use Cloudflare for perceptfolio.com, just log in.

---

## Step 2 — Create the storage box

1. In the left sidebar, click **Storage & Databases** → **KV**.
2. Click **Create Instance** (or **Create a namespace**).
3. Name it exactly: `PF_SYNC`
4. Click **Add**.

That's your storage. Nothing else to do here.

---

## Step 3 — Create the worker

1. In the left sidebar, click **Compute (Workers)** → **Workers & Pages**.
2. Click **Create** → **Start with Hello World!** → **Deploy**.
3. Cloudflare gives it a random name like `wispy-frost-1a2b`. Fine — but note the URL it shows you,
   something like:

   ```
   https://wispy-frost-1a2b.yourname.workers.dev
   ```

   **Write that URL down.** You'll need it on both devices.

4. Click **Edit code** (or **Continue to project** → **Edit code**).
5. Delete everything in the editor.
6. Open `worker.js` from your PerceptFolio files, copy all of it, paste it in.
7. Click **Deploy** (top right).

---

## Step 4 — Connect the worker to the storage box

Still in your worker, go to **Settings** → **Bindings**.

1. Click **Add** → **KV namespace**.
2. **Variable name:** `PF_SYNC` (exactly this — the code looks for this name)
3. **KV namespace:** pick the `PF_SYNC` you made in Step 2.
4. **Deploy**.

---

## Step 5 — Set your secret

This is your sync password. Make it long and random — you'll paste it, never type it.

Generate one however you like. A password manager works. So does mashing the keyboard for 40
characters. Don't reuse a password you use elsewhere.

Still in **Settings** → **Variables and Secrets**:

1. Click **Add**.
2. **Type:** Secret
3. **Variable name:** `SYNC_SECRET`
4. **Value:** paste your long random string
5. **Deploy**

Now add one more, as a plain variable this time (not a secret):

1. **Add** → **Type:** Text
2. **Variable name:** `ALLOWED_ORIGIN`
3. **Value:** `https://perceptfolio.com`
4. **Deploy**

`ALLOWED_ORIGIN` stops other websites from being able to call your worker from a visitor's browser.

**Save the secret somewhere you won't lose it.** If you lose it you can set a new one in Cloudflare
and re-enter it on both devices — your data isn't lost, but every device has to be reconnected.

---

## Step 5b — Add a FRED key (for the Market tab)

Only needed if you want the Market tab's VIX gauge and Buffett indicator. Skip it and everything
else still works; the tab just says the worker needs setting up.

The Market tab reads US economic data from the St. Louis Fed. Their API sends no CORS headers, which
means a browser cannot call it directly no matter what the app does — so the worker fetches it for
you and caches the result for 12 hours.

1. Get a free key at **fred.stlouisfed.org/docs/api/api_key.html**. Takes a minute, no card.
2. In your worker: **Settings** → **Variables and Secrets** → **Add**
3. **Type:** Secret · **Variable name:** `FRED_API_KEY` · **Value:** your key
4. **Deploy**

The key stays inside the worker and is never sent to the browser.

---

## Step 6 — Check it's alive

Open your worker URL in a browser tab. You should see:

```json
{"error":"Bad or missing sync key."}
```

**That's the correct answer.** It means the worker is running and correctly refusing a request with
no key. If you get a Cloudflare error page instead, something in Steps 3–5 didn't deploy.

---

## Step 7 — Connect your computer

1. Open perceptfolio.com, log into your account.
2. Go to **Settings** → **Sync Across Your Devices**.
3. **Sync URL:** your worker URL from Step 3.
4. **Sync key:** the `SYNC_SECRET` from Step 5.
5. Click **Save & connect**.

You should see `✓ Synced` with a timestamp. Your data is now in the cloud.

If you see `Sync key rejected`, the secret doesn't match — check for a copied trailing space.

---

## Step 8 — Connect your iPhone

1. Open perceptfolio.com in Safari on your phone.
2. **Create an account using the same email and password** as on your computer. This matters — the
   storage slot is derived from your email, so a different email syncs to a different slot and you'll
   see nothing.
3. Go to **Settings** → **Sync Across Your Devices**.
4. Paste the same URL and the same key.
5. Click **Save & connect**.

Your computer's data should appear. If the phone was empty, it pulls everything down.

Now add it to your home screen (Share → Add to Home Screen) and you're done.

---

## How it behaves day to day

- Pulls when you open the app.
- Pushes about 8 seconds after you stop making changes.
- Pushes when you close the tab or switch away from the app.
- **Sync now** forces both.
- **Pull from cloud** throws away this device's copy and takes the cloud version. For when a device
  has got out of step and you just want it to match.

## The limitation, stated plainly

This syncs your whole account as one lump, and the most recent save wins. It does **not** merge.

If you add NVDA on your phone while offline, and add AAPL on your laptop, and then both sync — you
end up with whichever one saved last, not both. The app warns you before overwriting changes that are
newer than the cloud copy, so you get a choice rather than a silent loss, but it can't combine them.

The habit that avoids this entirely: **open the app on a device and let it sync before you start
editing there.** Since it pulls on open, that's usually automatic.

Proper field-level merging needs a real database with per-record timestamps. That's a much bigger
build, and for one person moving between two devices it isn't worth it.

## Free tier headroom

Cloudflare's free plan gives you 1,000 writes a day. The app batches — it waits for a lull rather
than pushing on every keystroke — so normal use is nowhere near that. If you ever did hit it, syncing
stops until midnight UTC and your local data is untouched.
