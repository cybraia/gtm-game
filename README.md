# GTM Roulette

One spin per team: a product, a compatible buyer and a random GTM twist.
Spins are saved server-side per team name (case-insensitive, ignoring
leading/trailing spaces), so a team gets one spin across all devices.

## Deploy on Vercel

1. In the Vercel project: **Storage → Create / Connect Database → Upstash for
   Redis** (this is what replaced Vercel KV) and connect it to the project.
   That sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`. (`UPSTASH_REDIS_REST_URL`
   / `UPSTASH_REDIS_REST_TOKEN` also work.)
2. **Settings → Environment Variables:** add `HOST_KEY` (any secret you choose).
3. Redeploy. `vercel.json` serves `public/`; `api/` holds the functions.

If storage isn't connected, the page says so and spinning stays off.

- **Players:** share the plain URL (e.g. as a QR code).
- **Host:** open `/?host`, enter `HOST_KEY`. From there: test mode (spins aren't
  saved and don't use a team's spin), reset one team, or reset all teams.

## Layout

- `public/` — the page (static)
- `api/` — Vercel functions, all backed by `lib/game.js`
- `lib/decks.js` — decks, internal categories and matching (server-only)
- `lib/stores.js` — Redis (Upstash REST) and local JSON-file storage

## Run locally

```sh
HOST_KEY=choose-a-secret npm start      # http://localhost:3000
```

Uses Redis if the env vars above are set, otherwise `data/teams.json`.

## Test

```sh
npm test
```
