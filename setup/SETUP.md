# Build your own Innerloop — step by step

Innerloop is an open-source **personal health agent**. It connects a glucose sensor, an
Apple Watch, and photos of your meals into one place, and puts a chatbot on top that can
tell you — in plain English — *why your numbers move*.

This guide is written for people with **little or no coding experience**. You won't write
software from scratch; you'll create a few free accounts, copy some settings, and paste a
couple of files. Take it one part at a time — you can stop after any part and come back.

**Roughly how long:** an evening (2–4 hours), spread across the parts.
**Cost:** everything below has a free tier. The only things you might pay for are the glucose
sensor itself and (optionally) one small iPhone app (~€3).

```
  Glucose sensor ─┐
  Apple Watch ────┤─►  automations (n8n)  ─►  database  ◄─  chatbot (Telegram)
                  │                            (Neon)         │
                  └──────────────────────────────►│           │
                                                   ▼           ▼
                                        dashboard website (Vercel)
```

Don't worry if the words *n8n*, *webhook*, or *database* mean nothing yet — each part explains
what it is before you touch it.

---

## What you'll need

**Devices (all optional — set up only the parts you have):**
- A **glucose sensor** you can follow in the **LibreLinkUp** app (a Freestyle Libre sensor + the free LibreLinkUp "follower" app).
- An **iPhone + Apple Watch** for sleep, heart rate, steps and workouts.

**Free accounts (sign up as you go — links are in each part):**
- **Neon** — your database (where all the numbers are stored).
- **n8n** — the automation tool that fetches your data on a schedule.
- **Vercel** — hosts the dashboard website.
- **Telegram** + a bot from **@BotFather** — for logging meals by photo.
- **OpenClaw** — the chatbot "brain" ([openclaw.ai](https://openclaw.ai)).
- An **AI key** from Anthropic (Claude) or OpenAI — lets the bot read food photos and chat.

**One file to keep as you go:** copy [`.env.example`](.env.example) to a file called `.env` on
your computer (or just a notes document). Every time this guide gives you a password, URL or
key, paste it there so you don't lose it. **Never share this file or put it on the internet.**

> **Jargon, once:** A *database* is a spreadsheet-on-steroids that programs can read and write.
> An *API* is a web address a program can call to get or send data. A *webhook* is an API address
> that *you* create so other apps can send data **to** you. That's 90% of the vocabulary here.

---

## Part 1 · The database (Neon) — ~15 min

This is where every glucose reading, meal and health metric is stored. We'll use **Neon**
(free, and beginner-friendly). Supabase works too — see the note at the end.

1. Go to **[neon.tech](https://neon.tech)** and sign up (Google/GitHub login is fine).
2. Click **Create project**. Give it a name like `innerloop`. Pick the region closest to you.
   Leave everything else default. Click **Create**.
3. You'll land on the project dashboard. On the left, open **SQL Editor**.
4. Open the file [`schema.sql`](schema.sql) from this repo, **copy everything**, paste it into
   the SQL editor, and click **Run**. This creates the three tables that hold your data. You
   should see "Success". (You just built your database — that's it.)
5. **Get your connection details.** On the left, click **Connect** (or "Connection Details"):
   - Copy the **connection string** (starts with `postgresql://…`). Paste it into your `.env` as
     `NEON_OWNER_CONN` — this is the "full access" key; keep it private.
   - Neon also gives you a **"SQL over HTTP"** endpoint that looks like
     `https://…​.neon.tech/sql`. Paste that as `NEON_SQL_URL`. (If you don't see it, it's your
     host with `/sql` on the end — the guide's `.env.example` shows the shape.)
6. **Make a read-only key for the website (recommended, 2 min).** Back in the SQL Editor, paste
   and run the commented block at the bottom of `schema.sql` (remove the `--` at the start of
   each line first), replacing `change_me` with a password you choose. This creates a `dashboard_ro`
   user that can only *read*. Build its connection string by copying `NEON_OWNER_CONN` and swapping
   the username/password for `dashboard_ro` and your chosen password. Save it as `NEON_CONN`.
   *(Why: the public dashboard uses this read-only key, so even if someone pokes at it, they can't
   change or delete your data.)*

✅ **You now have a database.** Nothing is in it yet — the next parts fill it.

---

## Part 2 · The automations (n8n) — ~20 min to install

**n8n** is a tool where you connect "nodes" (little boxes) into a flow, like a flowchart that
runs by itself. We use it to fetch your glucose every 5 minutes and to receive your Apple Health
data. You don't build the flows — we give them to you as files to import.

**Get an n8n running (pick one):**
- **Easiest (no computer setup):** sign up at **[n8n.io](https://n8n.io)** → n8n Cloud (free trial).
- **Free forever, needs a always-on computer/server:** self-host. On a machine with Node.js:
  `npx n8n` (runs at `http://localhost:5678`). A small cloud server or a Raspberry Pi that stays
  on works well. *(This is the more technical option — n8n Cloud is fine to start.)*

Once n8n is open in your browser, you'll import the two workflow files in the next parts using
**Workflows → (top-right menu) → Import from File**.

---

## Part 3 · Glucose from your sensor (LibreLinkUp) — ~20 min

*Skip this part if you don't have a glucose sensor.*

This flow logs into LibreLinkUp (the same app you already use to see your sensor), grabs the
readings, and saves them to your database every 5 minutes.

1. In n8n, **import** [`n8n/blood-sugar-tracker.json`](n8n/blood-sugar-tracker.json). You'll see a
   row of connected boxes.
2. Click the **Credentials** box. Put your **LibreLinkUp email and password** in the two fields.
   *(These are the login you use for the LibreLinkUp app.)*
3. Click the **Write to Postgres** box. Find the header called `Neon-Connection-String` and paste
   your **`NEON_OWNER_CONN`** (the full-access one). In the URL field, paste your **`NEON_SQL_URL`**.
4. **Region:** the flow is set for Europe (`api-de.libreview.io`). If you're in the US, change the
   two boxes "Login LibreLinkUp", "Get Connections" and "Get Graph Data" to use `api-us.libreview.io`
   (elsewhere: `api.libreview.io`).
5. **The Account-Id (the only tricky bit).** LibreLinkUp wants a special ID in two boxes
   ("Get Connections" and "Get Graph Data"), currently set to `YOUR_LIBRELINKUP_ACCOUNT_ID`.
   Here's the no-code way to get it:
   1. In n8n, click the **Login LibreLinkUp** box and press **Execute step** (test it). If your
      email/password are right, the output shows a big blob of data.
   2. In that output, find **`data` → `user` → `id`** and copy that id value.
   3. Go to any "SHA-256 generator" website (search that term), paste the id, and copy the long
      hex result it gives back.
   4. Paste that result into the **Account-Id** field in *both* the "Get Connections" and
      "Get Graph Data" boxes. Also save it in `.env` as `LIBRELINKUP_ACCOUNT_ID`.
6. Click **Save**, then toggle the workflow **Active** (top-right). Within ~5 minutes you'll see
   rows appear in your `blutzucker` table (check Neon's Table view).

> **Stuck?** Use the "Execute workflow" button to run it once and read the red error on whichever
> box fails. Wrong password → the Login box fails. Wrong Account-Id → the Get Connections box fails.
> Wrong database string → the Write to Postgres box fails.

---

## Part 4 · Apple Watch data (iPhone Shortcut) — ~30 min  ⭐ most detailed

*Skip this part if you don't have an iPhone/Apple Watch.*

Your Apple Watch already records sleep, heart rate, HRV, steps and workouts into the iPhone's
**Health** app. We just need to send that data to your database on a schedule. Two ways — the
first needs **no coding** and is what I recommend.

### First, create the "mailbox" for the data (2 min)

1. In n8n, **import** [`n8n/apple-health-import.json`](n8n/apple-health-import.json).
2. Click the **Write to Postgres** box and paste your `NEON_OWNER_CONN` and `NEON_SQL_URL`
   (same as Part 3, step 3).
3. Click **Save** and toggle it **Active**.
4. Click the **Webhook** box (the first one) and copy its **Production URL**. It looks like
   `https://your-n8n-address/webhook/apple-health`. **This is the address your iPhone will send
   data to.** Keep it handy.

### Option A (recommended, no coding): the "Health Auto Export" app

**Health Auto Export** is a small iPhone app (~€3 on the App Store) that reads the Health app and
can send it anywhere on a schedule. It's the easiest bridge.

1. Install **Health Auto Export – JSON+CSV** from the App Store and open it.
2. When it asks, **allow access to Health data** (turn everything on, or at least sleep, heart
   rate, HRV, steps and workouts). *(This just lets the app read — nothing leaves your phone yet.)*
3. Go to the **Automations** tab → **Add Automation**.
4. Set it up like this (labels may vary slightly by app version):
   - **Automation type / Export method:** choose **REST API** (sometimes called "API" or "Webhook").
   - **URL:** paste your webhook address from above (`https://…/webhook/apple-health`).
   - **Format:** **JSON**.
   - **Data type:** **Health Metrics** (and, if offered separately, add **Workouts**).
   - **Metrics / data to include:** turn on **Sleep Analysis, Heart Rate, Heart Rate Variability,
     Resting Heart Rate, Step Count**, plus **Workouts**. (More is fine.)
   - **Aggregation / interval:** if asked, choose a small interval (e.g. every 1 hour, or "per
     sample") so you get detailed data, not just daily totals.
   - **Schedule / frequency:** **automatic**, e.g. every 1 hour (or "on a schedule" a few times a day).
5. Tap **Save**, then use the app's **"Run now" / "Manual export"** button once to test.
6. Check your `apple_health` table in Neon — you should see new rows appear. 🎉

> If nothing arrives: (a) re-copy the webhook URL exactly, (b) make sure the n8n workflow is
> **Active**, (c) in the app, confirm the export format is **JSON**. You can open the n8n workflow's
> **Executions** tab to see whether the data reached it and where it stopped.

### Option B (free, more manual): the built-in Shortcuts app

If you'd rather not buy an app, the free **Shortcuts** app (already on your iPhone) can do it,
but it's more hands-on and can only send a limited slice of Health data easily:

1. Open **Shortcuts** → **+** (new shortcut).
2. Add the action **Find Health Samples** → choose a type (e.g. *Heart Rate*), set a time range
   (e.g. "today").
3. Add **Get Contents of URL**:
   - **URL:** your webhook (`https://…/webhook/apple-health`).
   - **Method:** **POST**.
   - **Request Body:** **JSON**, shaped like the app export (this is the fiddly part — the built-in
     app can't perfectly match the expected format, so you may need to tweak the **Parse Health
     Data** code box in n8n to match what your shortcut sends).
4. To run it automatically, open the **Automation** tab in Shortcuts → **+** → **Time of Day** →
   pick times → run your shortcut.

Because the format matching is finicky, **Option A is much easier** for a non-technical setup.
Option B is there if you prefer free and don't mind trial-and-error.

---

## Part 5 · The dashboard website (Vercel) — ~15 min

This puts the good-looking dark dashboard online, protected by a login.

1. Make a free **[GitHub](https://github.com)** account if you don't have one, and either **fork**
   this repository or upload its files to a new repo of your own.
2. Go to **[vercel.com](https://vercel.com)**, sign up with GitHub, click **Add New → Project**,
   and pick your repo. Click **Deploy**. (Vercel figures out the rest — it's a static site.)
3. Open the project's **Settings → Environment Variables** and add:
   - `NEON_SQL_URL` — your database's SQL-over-HTTP URL.
   - `NEON_CONN` — your **read-only** connection string (the `dashboard_ro` one).
   - `BASIC_AUTH_USER` and `BASIC_AUTH_PASS` — invent a username and a strong password. This is the
     login for your dashboard.
4. Click **Redeploy** so the new settings take effect.
5. Open your Vercel URL. Your browser will pop up a **username/password box** — enter the two you
   just set. You should see your dashboard with your data. Add it to your phone's home screen to
   use it like an app.

*(How the login works, for the curious: a small file `middleware.js` asks for the username/password
on every page, and `api/query.js` only ever runs read-only lookups — so your health data stays
private and can't be changed from the web.)*

---

## Part 6 · The meal-logging chatbot (OpenClaw + Telegram) — ~30 min

This is the "send a photo of your food, get the nutrition, ask questions" part.

1. **Create a Telegram bot:** in Telegram, message **[@BotFather](https://t.me/BotFather)**, send
   `/newbot`, follow the prompts, and copy the **bot token** it gives you (save as `TELEGRAM_BOT_TOKEN`).
2. **Install OpenClaw** and create a workspace, following the docs at **[openclaw.ai](https://openclaw.ai)**.
   Connect your Telegram bot token, and add your **AI key** (Anthropic/Claude or OpenAI) — this is
   what reads the photos and chats.
3. **Give the agent its personality and tools:** copy the two files from [`agent/`](agent/) into your
   OpenClaw workspace:
   - `SOUL.md` — how the bot behaves.
   - `TOOLS.example.md` → rename to `TOOLS.md` and paste in your `NEON_SQL_URL` and
     `NEON_OWNER_CONN` so the bot can read/write your data.
4. **Try it:** message your bot on Telegram with a photo of a meal. It should reply with calories,
   carbs, protein and fat, and save the meal to your `mahlzeiten` table. Then ask it something like
   *"how did my heart rate trend this week?"* and it will look in the database and answer.

---

## Troubleshooting cheatsheet

| Symptom | Most likely cause |
|---|---|
| No glucose rows appear | LibreLinkUp email/password wrong, or wrong Account-Id, or wrong region host |
| No Apple Health rows appear | Export not set to **JSON**, wrong webhook URL, or the n8n workflow isn't **Active** |
| Dashboard shows a login box that won't accept your password | `BASIC_AUTH_USER`/`BASIC_AUTH_PASS` not saved, or you didn't **Redeploy** after adding them |
| Dashboard loads but no data | `NEON_CONN` is wrong, or the read-only role has no `SELECT` grant |
| n8n box turns red | Click it and read the error message — it names exactly what's wrong |

The best debugging tool is n8n's **Executions** tab: it shows every run, which box failed, and why.

---

## Notes

- **Security:** never share or publish your `.env`, your connection strings, tokens, LibreLinkUp
  password, or the Account-Id. This repo only ever contains placeholders. If a secret ever leaks,
  change it immediately.
- **Supabase instead of Neon:** create a Supabase project, run `schema.sql` in its SQL editor, and
  use its connection details in the same env variables. The workflows just send SQL, so any Postgres
  works.
- **This is not medical advice.** Innerloop shows patterns in your own data. It is not a medical
  device and doesn't diagnose or treat anything.
- **Make it yours.** Everything here is a starting point — fork it, rename things, change the agent's
  personality, add your own charts.
