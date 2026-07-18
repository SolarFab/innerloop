# TOOLS.md — local setup notes for the Innerloop agent

Copy this to your OpenClaw workspace as `TOOLS.md` and fill in your own values.
Never commit the filled-in version — it holds credentials.

## Database (Neon / Supabase / any Postgres over HTTP)

- **SQL-over-HTTP URL:** `https://YOUR-NEON-ENDPOINT.neon.tech/sql`
- **Connection string:** `postgresql://USER:PASSWORD@YOUR-NEON-HOST/neondb?sslmode=require`
- **Tables:** `blutzucker` (glucose, every 5 min), `mahlzeiten` (meals the agent logs), `apple_health`
- **Timezone:** store UTC, display in your local zone (e.g. Europe/Berlin)

### Query helper (bash)
```bash
query_db() {
  curl -s -X POST "$NEON_SQL_URL" \
    -H "Content-Type: application/json" \
    -H "Neon-Connection-String: $NEON_OWNER_CONN" \
    -d "{\"query\": \"$1\"}"
}
```

## Meal logging (the agent's main job)

When a food photo arrives on Telegram:
1. Use the vision model to estimate calories, carbs, sugar, protein, fat, fibre, portion size and a glycemic-index guess.
2. `INSERT` a row into `mahlzeiten` with those values and the current timestamp.
3. Reply with the breakdown, then (optionally) check the glucose curve 30 min later and comment on the response.

## Optional integrations

- **Google Calendar** — read/write, for context (put OAuth token/credentials paths here).
- **Web search** — e.g. a Serper API key for looking up nutrition facts.
