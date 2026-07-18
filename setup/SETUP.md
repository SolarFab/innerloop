# Build your own Innerloop

Innerloop is an open-source personal health agent. It ties a continuous glucose
monitor, an Apple Watch and a photo of your lunch into **one feedback loop**, then
puts an agent on top that tells you — in plain language — why your numbers move.

This guide walks through standing up your own copy. Everything here is a blueprint,
not a one-click installer: you'll clone the repo, run a schema, import two workflows,
wire up a bot, and deploy a dashboard. Budget an evening.

```
LibreLinkUp CGM ─┐
Apple Health ────┤ n8n workflows ──►  Postgres  ◄── OpenClaw agent (Telegram, vision)
                 │                    (Neon/Supabase)      │
                 └────────────────────────►│               │
                                            ▼               ▼
                              Vercel dashboard (login-gated PWA)
```

---

## What you need

**Hardware**
- A **continuous glucose monitor** readable via **LibreLinkUp** (Freestyle Libre + the LibreLinkUp follower app). *(Optional — skip the glucose parts if you don't have one.)*
- An **Apple Watch + iPhone** for sleep, heart rate, HRV, steps and workouts. *(Optional.)*

**Accounts (all have free tiers)**
- **n8n** — workflow automation (self-hosted or n8n Cloud). Runs the ingestion.
- **Postgres** — **Neon** or **Supabase** (either works; both speak SQL-over-HTTP). One database.
- **Vercel** — hosts the dashboard (static PWA + edge functions). Only needed to deploy.
- **Telegram** — a bot from [@BotFather](https://t.me/BotFather) for meal logging.
- **OpenClaw** — the agent runtime ([openclaw.ai](https://openclaw.ai)). Self-hosted.
- **An LLM key** — Anthropic (Claude) or OpenAI, for vision (food photos) + chat.

Copy [`.env.example`](.env.example) to `.env` and fill values in as you go.

---

## 1 · Database

1. Create a Postgres database on **Neon** or **Supabase**.
2. Run [`schema.sql`](schema.sql) in the SQL editor. It creates three tables:
   `blutzucker` (glucose), `mahlzeiten` (meals), `apple_health` (everything from the watch).
3. **Create a read-only role** for the dashboard (see the commented block at the bottom of
   `schema.sql`). The dashboard connects with this role and can only `SELECT` — so even if the
   endpoint is abused, nobody can write or drop. Keep the owner connection string for n8n only.
4. Grab your **SQL-over-HTTP URL** (Neon shows it in the project's connection panel) → `NEON_SQL_URL`.

> Not using Neon? Supabase exposes the same thing via PostgREST/`/rest`, or you can point the
> n8n HTTP nodes at any Postgres HTTP proxy. The workflows just POST `{ "query": "..." }`.

---

## 2 · Glucose ingestion (n8n)

Import [`n8n/blood-sugar-tracker.json`](n8n/blood-sugar-tracker.json) into n8n (**Workflows → Import from File**).
It logs into LibreLinkUp every 5 minutes, pulls the graph, and upserts into `blutzucker`.

Fill in three things:
- **Credentials** node → your LibreLinkUp `email` / `password`. *(Better: move these into an n8n credential instead of a Set node so they aren't stored in plaintext.)*
- **Get Connections / Get Graph Data** nodes → your `Account-Id` header. It's the SHA-256 of your
  LibreLinkUp account id; the easiest way to get it: run the "Login" + "Get Connections" nodes once,
  look at the request the app makes, or see the many community write-ups on the LibreLinkUp API.
- **Write to Postgres** node → your **owner** connection string and SQL URL.
- Match the **regional host** (`api-de` for EU, `api-us` for US, `api` global) to your account.

Activate it. New readings should appear in `blutzucker` within 5 minutes.

---

## 3 · Apple Health ingestion (n8n + iOS Shortcut)

Import [`n8n/apple-health-import.json`](n8n/apple-health-import.json). It exposes a webhook at
`/webhook/apple-health` and parses sleep stages, heart rate, HRV, steps and workouts into `apple_health`.

On the iPhone, use the **Health Auto Export** app (or a custom Shortcut) to POST your health data
as JSON to that webhook on a schedule. Set the **Write to Postgres** node's connection string as in step 2.

The parser understands the Health Auto Export JSON shape (`{ data: { metrics: [...], workouts: [...] } }`).
If your exporter differs, adjust the `Parse Health Data` code node.

---

## 4 · The agent (OpenClaw + Telegram)

1. Install **OpenClaw** and create a workspace for the agent.
2. Create a **Telegram bot** with @BotFather, and connect it in OpenClaw.
3. Drop the templates from [`agent/`](agent/) into the workspace:
   - `SOUL.md` — the agent's persona.
   - `TOOLS.example.md` → save as `TOOLS.md` and fill in your DB URL + owner connection string.
4. Give the agent an LLM key with **vision** (Claude or GPT). Now: send it a food photo on Telegram →
   it estimates the macros, writes a row to `mahlzeiten`, and replies. Ask it "how did my HR trend this
   week?" and it queries Postgres and answers in the chat.

---

## 5 · The dashboard (Vercel)

The dashboard lives in this repo (`index.html`, `api/query.js`, `middleware.js`).

1. Import the repo into **Vercel** (or `vercel deploy`).
2. Set environment variables (Vercel → Settings → Environment Variables):
   - `NEON_SQL_URL` and `NEON_CONN` (the **read-only** connection string from step 1).
   - `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` — the login wall for your dashboard.
3. Deploy. `middleware.js` gates every route with HTTP Basic Auth, and `api/query.js` only ever runs
   read-only `SELECT`s as the read-only role. Your health data sits behind a login; the marketing/landing
   page (if you host one) stays public.

That's it — open the dashboard, log in, and watch a meal land on your glucose curve.

---

## Notes

- **Security:** never commit real connection strings, tokens, the LibreLinkUp password, or the
  `Account-Id`. Everything here uses placeholders. Rotate anything that ever leaked.
- **Not medical advice.** Innerloop surfaces patterns in your own data. It is not a medical device.
- **Make it yours.** The schema, workflows and agent prompt are starting points — fork freely.
