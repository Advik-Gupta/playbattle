import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { Server } from 'socket.io';
import { AVATAR_IDS, CPU_ID, DEFAULT_AVATAR_ID } from './protocol.js';
import type {
  ClientToServerEvents,
  PlayerProfile,
  ServerToClientEvents,
  SocketData,
} from './protocol.js';
import type { Room } from './rooms.js';
import { reportMatch } from './results.js';
import { bannedCount, isBanned, pendingWarning, refreshBans, clearWarning } from './bans.js';
import { bucketCount, httpLimiter, sweepBuckets, take } from './limits.js';
import {
  addMessage,
  allowed,
  clean,
  clearRoom,
  history,
  isClean,
  mask,
  spoils,
  sweepRates as sweepChatRates,
  systemMessage,
} from './chat.js';
import {
  connected as presenceConnected,
  disconnected as presenceDisconnected,
  setRoom,
  socketsFor,
  statusOf,
  touch,
  unwatch,
  watch,
  watchersOf,
  sweepOffline as sweepPresence,
} from './presence.js';
import {
  allRoomCodes,
  banAndDrop,
  closeRoom,
  createRoom,
  createSolo,
  endRound,
  everyoneReady,
  getRoom,
  joinQueue,
  joinRoom,
  leaveQueue,
  allowJoin,
  dropJoinRequest,
  leaveRoom,
  makeMove,
  markDisconnected,
  queueSize,
  reapAbsent,
  removePlayer,
  resign,
  respondToJoin,
  openRooms,
  playerSockets,
  rematch,
  roomCount,
  roundIsOver,
  serialize,
  setConfig,
  setReady,
  startRound,
  submitGuess,
  takeCpuTurn,
  takeHint,
  votekick,
  sweepEmptyRooms,
  timedOut,
} from './rooms.js';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../.env') });

const port = Number(process.env.GAME_SERVER_PORT ?? 4000);
const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const browseLimit = httpLimiter(30, 1);

const app = express();
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    uptime: Math.round(process.uptime()),
    rooms: roomCount(),
    queue: queueSize(),
    banned: bannedCount(),
    buckets: bucketCount(),
  });
});

app.get('/rooms', (req, res) => {
  if (!browseLimit(req.ip ?? 'unknown')) {
    res.status(429).json({ error: 'slow down' });
    return;
  }

  res.json({ rooms: openRooms() });
});

app.get('/admin/rooms', (req, res) => {
  const secret = process.env.INTERNAL_API_SECRET ?? '';

  if (!secret || req.headers['x-internal-secret'] !== secret) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const rooms = allRoomCodes()
    .map((code) => getRoom(code))
    .filter((room): room is Room => Boolean(room))
    .map((room) => ({
      code: room.code,
      game: room.config.game,
      mode: room.config.mode,
      phase: room.phase,
      round: room.round,
      rounds: room.config.rounds,
      visibility: room.config.visibility,
      players: [...room.players.values()].map((player) => ({
        id: player.profile.id,
        name: player.profile.name,
        connected: player.socketId !== null,
        score: player.score,
      })),
    }));

  res.json({ rooms });
});

app.post('/admin/close', (req, res) => {
  const secret = process.env.INTERNAL_API_SECRET ?? '';

  if (!secret || req.headers['x-internal-secret'] !== secret) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const code = String(req.body?.code ?? '').toUpperCase();
  const room = getRoom(code);

  if (!room) {
    res.status(404).json({ error: 'room not found' });
    return;
  }

  io.to(code).emit('room:closed', 'an admin closed this room');
  closeRoom(code);
  console.log('admin closed room', code);

  res.json({ ok: true });
});

app.post('/bans/sync', async (req, res) => {
  const secret = process.env.INTERNAL_API_SECRET ?? '';

  if (!secret || req.headers['x-internal-secret'] !== secret) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  await refreshBans(true);

  const userId = String(req.body?.userId ?? '');
  let dropped = 0;

  if (userId && isBanned(userId)) {
    for (const socketId of socketsFor(userId)) {
      const target = io.sockets.sockets.get(socketId);
      if (!target) continue;

      target.emit('toast', { kind: 'error', message: 'an admin has banned this account' });
      target.disconnect(true);
      dropped += 1;
    }
  }

  res.json({ ok: true, dropped, banned: bannedCount() });
});

app.post('/announce', (req, res) => {
  const secret = process.env.INTERNAL_API_SECRET ?? '';

  if (!secret || req.headers['x-internal-secret'] !== secret) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const message = String(req.body?.message ?? '').trim().slice(0, 200);
  if (!message) {
    res.status(400).json({ error: 'empty message' });
    return;
  }

  io.emit('toast', { kind: 'info', message });
  console.log('announcement sent:', message);
  res.json({ ok: true });
});

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, never, SocketData>(server, {
  cors: { origin: origins, credentials: true },
});

function readProfile(raw: unknown): PlayerProfile | null {
  if (!raw || typeof raw !== 'object') return null;

  const { id, name, avatar } = raw as Record<string, unknown>;
  if (typeof id !== 'string' || id.length === 0) return null;

  return {
    id,
    name: typeof name === 'string' && name ? name.slice(0, 20) : 'player',
    avatar:
      typeof avatar === 'string' && (AVATAR_IDS as readonly string[]).includes(avatar)
        ? avatar
        : DEFAULT_AVATAR_ID,
  };
}

io.use(async (socket, next) => {
  const profile = readProfile(socket.handshake.auth?.profile);
  if (!profile) return next(new Error('missing profile'));

  await refreshBans();

  const ban = isBanned(profile.id);
  if (ban) {
    return next(new Error(ban.reason ? `banned: ${ban.reason}` : 'you are banned'));
  }

  socket.data.profile = profile;
  socket.data.roomCode = null;
  next();
});

const ROUND_BREAK = 5000;

function announcePresence(userId: string) {
  const entry = statusOf(userId);

  for (const watcherId of watchersOf(userId)) {
    for (const socketId of socketsFor(watcherId)) {
      io.to(socketId).emit('presence:update', entry);
    }
  }
}

function push(room: Room | null) {
  if (!room) return;
  for (const { socketId, userId } of playerSockets(room)) {
    io.to(socketId).emit('room:state', serialize(room, userId));
  }
}

function maybeStart(room: Room) {
  if (room.phase !== 'lobby' || !everyoneReady(room)) return;

  startRound(room);
  io.to(room.code).emit('game:roundStart', room.round);
  push(room);
  scheduleCpu(room);
}

function scheduleCpu(room: Room) {
  if (room.config.mode !== 'solo' || room.config.game !== 'tictactoe') return;
  if (room.ttt?.turnId !== CPU_ID) return;

  setTimeout(() => {
    const result = takeCpuTurn(room.code);
    if (!result) return;

    push(result.room);
    if (result.done) finishRound(result.room);
  }, 600);
}

function finishRound(room: Room) {
  const summary = endRound(room);
  io.to(room.code).emit('game:roundEnd', summary);
  push(room);

  if (room.phase === 'match_over') {
    for (const { socketId, userId } of playerSockets(room)) {
      io.to(socketId).emit('game:matchEnd', serialize(room, userId));
    }
    void reportMatch(room, room.matchId);
    return;
  }

  setTimeout(() => {
    const live = getRoom(room.code);
    if (!live || live.phase !== 'round_over') return;

    startRound(live);
    io.to(live.code).emit('game:roundStart', live.round);
    push(live);
    scheduleCpu(live);
  }, ROUND_BREAK);
}

io.on('connection', (socket) => {
  const profile = socket.data.profile as PlayerProfile;
  console.log('connected', profile.id, socket.id);

  for (const existing of socketsFor(profile.id)) {
    const other = io.sockets.sockets.get(existing);
    if (!other) continue;

    other.emit('session:replaced');
    other.disconnect(true);
  }

  presenceConnected(profile.id, socket.id);
  announcePresence(profile.id);

  const warning = pendingWarning(profile.id);
  if (warning) {
    socket.emit('sanction:notice', warning);
    clearWarning(profile.id);
  }

  const guard = (action: string, ack: (res: { ok: false; error: string }) => void) => {
    if (take(profile.id, action)) return true;

    ack({ ok: false, error: 'you are doing that too fast' });
    return false;
  };

  const enterRoom = (code: string) => {
    socket.join(code);
    socket.data.roomCode = code;
    setRoom(profile.id, code);
    announcePresence(profile.id);
    socket.emit('chat:history', history(code));
  };

  const exitCurrent = () => {
    const code = socket.data.roomCode;
    if (!code) return;

    const previous = leaveRoom(code, profile.id);
    socket.leave(code);
    socket.data.roomCode = null;
    setRoom(profile.id, null);
    announcePresence(profile.id);

    if (previous && previous.players.size > 0) {
      io.to(code).emit('chat:message', systemMessage(code, `${profile.name} left`));
    } else {
      clearRoom(code);
    }

    push(previous);

    if (!previous) return;
    if (previous.phase === 'playing' && roundIsOver(previous)) finishRound(previous);
    else maybeStart(previous);
  };

  socket.on('room:create', (config, ack) => {
    if (!guard('room:create', ack)) return;

    exitCurrent();
    const room = createRoom(profile, socket.id, config ?? {});
    enterRoom(room.code);
    push(room);
    ack({ ok: true, data: { code: room.code } });
  });

  socket.on('room:solo', (config, ack) => {
    if (!guard('room:solo', ack)) return;

    exitCurrent();
    const room = createSolo(profile, socket.id, config ?? {});
    enterRoom(room.code);
    push(room);
    socket.emit('game:roundStart', room.round);
    scheduleCpu(room);
    ack({ ok: true, data: { code: room.code } });
  });

  socket.on('game:hint', (ack) => {
    if (!guard('game:hint', ack)) return;

    const code = socket.data.roomCode;
    if (!code) return ack({ ok: false, error: 'not in a room' });

    const result = takeHint(code, profile.id);
    if (!result.ok) return ack({ ok: false, error: result.error });

    push(result.room);
    ack({ ok: true, data: result.hint });
  });

  socket.on('room:join', (code, ack) => {
    if (!guard('room:join', ack)) return;

    const wanted = String(code ?? '').trim().toUpperCase();
    const result = joinRoom(wanted, profile, socket.id);

    if (!result.ok) {
      if (result.pending) {
        const room = getRoom(wanted);
        const request = room?.joinRequests.find((entry) => entry.userId === profile.id);

        if (room && request) {
          for (const socketId of socketsFor(room.hostId)) {
            io.to(socketId).emit('room:joinRequest', request);
          }

          push(room);
        }

        return ack({ ok: true, data: { code: wanted, pending: true } });
      }

      return ack({ ok: false, error: result.error });
    }

    if (socket.data.roomCode && socket.data.roomCode !== result.room.code) exitCurrent();

    enterRoom(result.room.code);
    io.to(result.room.code).emit(
      'chat:message',
      systemMessage(result.room.code, `${profile.name} joined`),
    );
    push(result.room);
    ack({ ok: true, data: { code: result.room.code } });
  });

  socket.on('room:ready', (ready, ack) => {
    const code = socket.data.roomCode;
    if (!code) return ack({ ok: false, error: 'not in a room' });

    const room = setReady(code, profile.id, Boolean(ready));
    push(room);
    ack({ ok: true, data: null });

    if (room) maybeStart(room);
  });

  socket.on('game:guess', (word, ack) => {
    if (!guard('game:guess', ack)) return;

    const code = socket.data.roomCode;
    if (!code) return ack({ ok: false, error: 'not in a room' });

    const result = submitGuess(code, profile.id, word);
    if (!result.ok) return ack({ ok: false, error: result.error });

    socket.to(result.room.code).emit('game:opponentGuessed', profile.id);
    push(result.room);
    ack({ ok: true, data: null });

    if (result.done) finishRound(result.room);
  });

  socket.on('room:rematch', (ack) => {
    const code = socket.data.roomCode;
    if (!code) return ack({ ok: false, error: 'not in a room' });

    const result = rematch(code, profile.id);
    if (!result.ok) return ack({ ok: false, error: result.error });

    push(result.room);
    ack({ ok: true, data: null });
  });

  socket.on('room:config', (config, ack) => {
    const code = socket.data.roomCode;
    if (!code) return ack({ ok: false, error: 'not in a room' });

    const result = setConfig(code, profile.id, config ?? {});
    if (!result.ok) return ack({ ok: false, error: result.error });

    push(result.room);
    ack({ ok: true, data: null });
  });

  socket.on('room:leave', (ack) => {
    exitCurrent();
    ack({ ok: true, data: null });
  });

  const dropFrom = (room: Room, targetId: string, reason: string) => {
    banAndDrop(room, targetId);

    for (const socketId of socketsFor(targetId)) {
      const target = io.sockets.sockets.get(socketId);
      if (!target || target.data.roomCode !== room.code) continue;

      target.leave(room.code);
      target.data.roomCode = null;
      target.emit('room:removed', reason);
    }

    setRoom(targetId, null);
    announcePresence(targetId);
    io.to(room.code).emit('chat:message', systemMessage(room.code, `${reason}`));
    push(room);

    if (room.phase === 'playing' && roundIsOver(room)) finishRound(room);
    else maybeStart(room);
  };

  socket.on('room:votekick', (targetId, ack) => {
    if (!guard('room:votekick', ack)) return;

    const code = socket.data.roomCode;
    if (!code) return ack({ ok: false, error: 'not in a room' });

    const result = votekick(code, profile.id, String(targetId ?? ''));
    if (!result.ok) return ack({ ok: false, error: result.error });

    if (result.kicked) dropFrom(result.room, result.kicked, 'a player was voted out');
    else push(result.room);

    ack({ ok: true, data: null });
  });

  socket.on('room:remove', (targetId, ack) => {
    const code = socket.data.roomCode;
    if (!code) return ack({ ok: false, error: 'not in a room' });

    const result = removePlayer(code, profile.id, String(targetId ?? ''));
    if (!result.ok) return ack({ ok: false, error: result.error });

    dropFrom(result.room, result.kicked, 'the host removed a player');
    ack({ ok: true, data: null });
  });

  socket.on('game:move', (index, ack) => {
    if (!guard('game:move', ack)) return;

    const code = socket.data.roomCode;
    if (!code) return ack({ ok: false, error: 'not in a room' });

    const result = makeMove(code, profile.id, Number(index));
    if (!result.ok) return ack({ ok: false, error: result.error });

    push(result.room);
    ack({ ok: true, data: null });

    if (result.done) {
      finishRound(result.room);
      return;
    }

    scheduleCpu(result.room);
  });

  socket.on('game:skip', (ack) => {
    const code = socket.data.roomCode;
    if (!code) return ack({ ok: false, error: 'not in a room' });

    const result = resign(code, profile.id);
    if (!result.ok) return ack({ ok: false, error: result.error });

    push(result.room);
    ack({ ok: true, data: null });

    if (result.done) finishRound(result.room);
  });

  socket.on('room:quickmatch', (game, ack) => {
    if (!guard('room:quickmatch', ack)) return;

    exitCurrent();

    const wanted = game === 'tictactoe' ? 'tictactoe' : 'wordbattle';
    const result = joinQueue(profile, socket.id, wanted);
    if (result.waiting) return ack({ ok: true, data: { code: '', waiting: true } });

    const { room, opponent } = result;
    enterRoom(room.code);

    for (const socketId of socketsFor(opponent.profile.id)) {
      const other = io.sockets.sockets.get(socketId);
      if (!other) continue;

      other.join(room.code);
      other.data.roomCode = room.code;
      setRoom(opponent.profile.id, room.code);
      announcePresence(opponent.profile.id);
      other.emit('queue:matched', room.code);
    }

    push(room);
    ack({ ok: true, data: { code: room.code, waiting: false } });
  });

  socket.on('room:cancelQuickmatch', (ack) => {
    leaveQueue(profile.id);
    ack({ ok: true, data: null });
  });

  socket.on('room:respondJoin', (payload, ack) => {
    const code = socket.data.roomCode;
    if (!code) return ack({ ok: false, error: 'not in a room' });

    const result = respondToJoin(
      code,
      profile.id,
      String(payload?.userId ?? ''),
      Boolean(payload?.accept),
    );

    if (!result.ok) return ack({ ok: false, error: result.error });

    for (const socketId of socketsFor(result.request.userId)) {
      io.to(socketId).emit('room:joinResponse', { code, accepted: result.accepted });
    }

    push(result.room);
    ack({ ok: true, data: null });
  });

  socket.on('presence:watch', (userIds, ack) => {
    const list = Array.isArray(userIds) ? userIds.filter((id) => typeof id === 'string') : [];
    ack({ ok: true, data: watch(profile.id, list) });
  });

  socket.on('presence:ping', (ack) => {
    touch(profile.id);
    ack({ ok: true, data: null });
  });

  socket.on('invite:send', (toUserId, ack) => {
    if (!guard('invite:send', ack)) return;

    const code = socket.data.roomCode;
    if (!code) return ack({ ok: false, error: 'you are not in a room' });

    const room = getRoom(code);
    if (!room) return ack({ ok: false, error: 'room not found' });
    if (room.config.mode === 'solo') return ack({ ok: false, error: 'solo games are private' });
    if (room.players.size >= room.config.maxPlayers) {
      return ack({ ok: false, error: 'room is full' });
    }

    const targets = socketsFor(String(toUserId ?? ''));
    if (targets.length === 0) return ack({ ok: false, error: 'they are offline' });

    allowJoin(room.code, String(toUserId ?? ''));

    for (const socketId of targets) {
      io.to(socketId).emit('invite:received', {
        fromId: profile.id,
        fromName: profile.name,
        fromAvatar: profile.avatar,
        code: room.code,
        mode: room.config.mode,
        game: room.config.game,
      });
    }

    ack({ ok: true, data: null });
  });

  socket.on('chat:send', (text, ack) => {
    const code = socket.data.roomCode;
    if (!code) return ack({ ok: false, error: 'not in a room' });

    const body = clean(text);
    if (!body) return ack({ ok: false, error: 'say something first' });
    if (!allowed(profile.id)) return ack({ ok: false, error: 'slow down a bit' });

    const room = getRoom(code);
    if (room?.phase === 'playing' && room.answer && spoils(body, room.answer)) {
      return ack({ ok: false, error: 'no spoilers while the round is on' });
    }

    const flagged = !isClean(body);
    const message = addMessage(code, {
      userId: profile.id,
      name: profile.name,
      avatar: profile.avatar,
      text: flagged ? mask(body) : body,
      flagged,
      system: false,
    });

    io.to(code).emit('chat:message', message);
    ack({ ok: true, data: null });
  });

  socket.on('disconnect', () => {
    console.log('disconnected', profile.id, socket.id);

    presenceDisconnected(profile.id, socket.id);
    leaveQueue(profile.id);

    const pendingIn = socket.data.roomCode;
    if (pendingIn) dropJoinRequest(pendingIn, profile.id);
    unwatch(profile.id);
    announcePresence(profile.id);

    const room = markDisconnected(socket.id);
    push(room);

    if (!room) return;
    if (room.phase === 'playing' && roundIsOver(room)) finishRound(room);
    else maybeStart(room);
  });
});

setInterval(() => {
  for (const code of allRoomCodes()) {
    const room = getRoom(code);
    if (!room) continue;
    if (timedOut(room) || (room.phase === 'playing' && roundIsOver(room))) finishRound(room);
  }
}, 1000);

setInterval(() => {
  for (const code of allRoomCodes()) {
    const room = getRoom(code);
    if (!room) continue;

    for (const userId of reapAbsent(room)) {
      io.to(code).emit('chat:message', systemMessage(code, 'a player was dropped for being away'));
      console.log('dropped absent player', userId, 'from', code);
    }
  }

  for (const code of sweepEmptyRooms()) {
    clearRoom(code);
    io.to(code).emit('room:closed', 'room closed after being empty');
    console.log('closed empty room', code);
  }
}, 30_000);

setInterval(() => {
  void refreshBans(true);
  sweepChatRates();
  sweepPresence();
  sweepBuckets();
}, 60_000);

server.listen(port, () => {
  console.log(`server on http://localhost:${port}`);
});
