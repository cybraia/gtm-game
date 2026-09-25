# GTM Roulette

One spin per team: a product, a compatible buyer and a random GTM twist.

## Run

```sh
HOST_KEY=choose-a-secret npm start      # http://localhost:3000 (PORT to change)
```

No dependencies; Node 18+. Spins are saved server-side in `data/teams.json`
(`DATA_FILE` to change), so run it somewhere with a **persistent disk**.
Team names match case-insensitively, ignoring leading/trailing spaces.

- **Players:** share the plain URL (e.g. as a QR code).
- **Host:** open `/?host`, enter `HOST_KEY`. From there: test mode (spins aren't
  saved and don't use a team's spin), reset one team, or reset all teams.

If the page is hosted as static files without `server.js`, it still works but
shows a warning: spins are then saved per device only, so one spin per team
cannot be enforced across devices.

## Test

```sh
npm test
```
