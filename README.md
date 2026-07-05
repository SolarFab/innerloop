# Innerloop

Personal health intelligence dashboard. Correlates continuous glucose data with meals, sleep, workouts, and Apple Health metrics in one place.

**Live:** [bloodbuddie.vercel.app](https://bloodbuddie.vercel.app)

## What it does

- **Glucose timeline** — CGM readings charted with meal and workout annotations, so spikes are traceable to their cause
- **Meal logging via Telegram** — send a photo of a meal to a Telegram agent; a vision model estimates calories, carbs, protein, fat, and glycemic index, and writes the entry to the database
- **Apple Health sync** — sleep, steps, resting heart rate, HRV, and workout data streamed via an iOS Shortcut (`HealthSync.shortcut`)
- **Analytics** — time-in-range (70–180 mg/dl) week-over-week, post-meal glucose response per meal, workout–glucose interaction, HRV trends
- **Installable PWA** — service worker, manifest, works on the phone home screen

## How it works

```
iOS Shortcut ──► Postgres (Neon) ◄── Telegram agent (meal photos, vision)
                     ▲
                     │  read-only, token-gated edge API
                     ▼
          Static PWA dashboard (Vercel)
```

- **Frontend:** single-file HTML/JS dashboard, Chart.js-style visualizations, no framework
- **API:** Vercel Edge Function proxying read-only queries to Neon over HTTP
- **Database:** Neon Postgres — tables for glucose readings, meals, Apple Health metrics, workout plans
- **Ingestion:** Apple Shortcuts automation for health metrics; an [OpenClaw](https://openclaw.ai) agent handles Telegram meal photos

## Stack

Vanilla JS PWA · Vercel Edge Functions · Neon (Postgres) · Apple Shortcuts · Telegram Bot API · Claude vision

## Status

Personal project, running daily since March 2026. Built for one user (me) — not multi-tenant.
