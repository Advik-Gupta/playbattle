# playbattle

multiplayer games in the browser. next.js on the front, socket.io server for the realtime bits.

## games

- **wordbattle** — five letters, six guesses, up to four people racing each other. solo mode with hints too.
- **tic tac toe** — best of three, the opener swaps each round. play a friend or the computer.
- **anagram rush** — seven letters, sixty seconds, build as many words as you can.
- **daily word** — one word a day, same for everyone, with its own streak and board.

## what's in it

- google login, display names, preset avatars
- rooms with codes, public room browser, quick match queues per game
- private rooms where people knock and the host lets them in
- spectating: watch any open room, chat along, letters stay hidden until the round ends
- live chat with a profanity filter, rate limits and no answer spoilers mid round
- friends, presence, and game invites that reach you anywhere on the site
- votekick, host removal, per room bans, warnings and timed bans
- stats, match history with round by round boards, per game leaderboards, public profiles
- badges with progress tracking
- a personal word list that fills up as you play, with definitions
- rejoin your game after a refresh, nothing is lost
- dark mode, mobile layout, installable as a pwa
- admin panel at /admin behind a code, with analytics, live rooms and moderation

## words

the guess list is 8,518 five letter words pulled from the system dictionary. answers come from a
smaller curated list of 492 common words, so you can guess anything real but never get something
obscure as the answer. anagram rush has its own list of 3 to 7 letter words.

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

## deploying

there are two processes: the next app and the socket server. both have a dockerfile, and there is a compose file that also brings up mongo.

```
cp .env.example .env
docker compose up --build
```

set `NEXT_PUBLIC_GAME_SERVER_URL` to the public url of the socket server before building the web image, since it gets baked into the client bundle. behind a reverse proxy set `TRUST_PROXY_HOPS=1` so rate limits key on real client ips.

the socket server exposes `/health` for metrics and `/ready` for readiness checks. it drains on SIGTERM: connected players get told the server is restarting before sockets close.

running without docker:

```
npm run build
npm run start         # next app on :3000
npm run start:server  # socket server on :4000
```

## layout

```
web/      next.js app, ui, database access
server/   express + socket.io game server
```

both live in one npm workspace, so `npm run dev` starts them together. games are split per folder on both sides (`server/src/games`, `web/src/components/games`) so adding another one does not touch the room plumbing. a game module says how a round starts, when it is over, and how to summarise it, and the room code handles everything else.
