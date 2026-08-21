# playbattle

multiplayer games in the browser. next.js on the front, socket.io server for the realtime bits.

## games

- **wordbattle** — five letters, six guesses, up to four people racing each other. solo mode with hints too.
- **tic tac toe** — best of three, the opener swaps each round. play a friend or the computer.

## what's in it

- google login, display names, preset avatars
- rooms with codes, public room browser, quick match queues per game
- live chat with a profanity filter, rate limits and no answer spoilers mid round
- friends, presence, and game invites that reach you anywhere on the site
- votekick, host removal and per room bans
- stats, match history, per game leaderboards, public profiles
- a personal word list that fills up as you play, with definitions
- dark mode, mobile layout, installable as a pwa
- admin panel at /admin behind a code

## running it

```
npm install
cp .env.example .env
npm run dev
```

web on :3000, game server on :4000.

you need a mongodb connection string and google oauth credentials in `.env`. without a database the games still run, but nothing gets saved.

## env

| key | what it does |
| --- | --- |
| `MONGODB_URI` | mongo connection string |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | google oauth app |
| `AUTH_SECRET` | session signing secret |
| `AUTH_URL` | base url of the web app |
| `GAME_SERVER_PORT` | port for the socket server |
| `NEXT_PUBLIC_GAME_SERVER_URL` | where the browser reaches the socket server |
| `WEB_APP_URL` | where the game server reaches the web app |
| `CORS_ORIGINS` | comma separated origins allowed to connect |
| `TRUST_PROXY_HOPS` | set to 1 behind a reverse proxy so rate limits see real client ips |
| `INTERNAL_API_SECRET` | shared secret between the two processes |
| `ADMIN_CODE` | code for the admin panel |

## layout

```
web/      next.js app, ui, database access
server/   express + socket.io game server
```

both live in one npm workspace, so `npm run dev` starts them together. games are split per folder on both sides (`server/src/games`, `web/src/components/games`) so adding another one does not touch the room plumbing.
