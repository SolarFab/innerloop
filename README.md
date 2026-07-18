# Innerloop

**Chat with your metabolism.** A personal health agent that ties your continuous glucose
monitor, your Apple Watch and a photo of your lunch into one feedback loop — then puts an
agent on top that tells you, in plain language, *why your numbers move*.

🌐 **Landing:** [innerloop-health.vercel.app](https://innerloop-health.vercel.app)
🛠 **Build your own:** [SETUP.md](setup/SETUP.md) — it's open source.

## What it does

- **Glucose timeline** — CGM readings charted with meal and workout markers, so every spike is traceable to its cause.
- **Meal logging via Telegram** — send a photo of a meal; a vision model estimates calories, carbs, protein, fat and glycemic load and logs it.
- **Apple Health sync** — sleep, steps, resting heart rate, HRV and workouts, streamed via an iOS Shortcut.
- **Ask your data anything** — "how did my HR trend this week?" → the agent queries Postgres and answers in the chat, with a table.
- **Installable PWA** — dark dashboard, login-gated, works on the phone home screen.

## How it works

```
LibreLinkUp CGM ─┐
Apple Health ────┤ n8n workflows ──►  Postgres  ◄── OpenClaw agent (Telegram, vision)
                 │                    (Neon/Supabase)      │
                 └────────────────────────►│               │
                                            ▼               ▼
                              Vercel dashboard (login-gated PWA)
```

- **Frontend:** a single-file HTML/JS dashboard, no framework.
- **API:** a Vercel Edge Function running read-only queries as a read-only DB role.
- **Auth:** HTTP Basic Auth login wall (`middleware.js`).
- **Database:** Neon (or Supabase) Postgres — glucose, meals, Apple Health.
- **Ingestion:** n8n workflows (CGM every 5 min; Apple Health via iOS Shortcut webhook).
- **Agent:** an [OpenClaw](https://openclaw.ai) agent on Telegram handles meal photos and conversational analytics.

## Build your own

Everything you need is in [`setup/`](setup/): the database schema, the (sanitized) n8n workflows,
`.env.example`, and OpenClaw agent templates. Start with **[setup/SETUP.md](setup/SETUP.md)**.

## Repo layout

| Path | What |
|---|---|
| `index.html` | The dashboard (PWA) |
| `api/query.js` | Read-only SQL-over-HTTP endpoint |
| `middleware.js` | Basic Auth login wall |
| `setup/` | Schema, n8n workflows, agent templates, setup guide |

## Status

A personal project, running daily since March 2026 — and now something you can rebuild for yourself.
Not a medical device; it surfaces patterns in your own data, it doesn't give medical advice.
