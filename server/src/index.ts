import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  PlayerProfile,
  ServerToClientEvents,
  SocketData,
} from './protocol.js';
import type { Room } from './rooms.js';
import { reportMatch } from './results.js';
import {
  allRoomCodes,
  createRoom,
  endRound,
  everyoneReady,
  getRoom,
  joinRoom,
  leaveRoom,
  markDisconnected,
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

const app = express();
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: Math.round(process.uptime()), rooms: roomCount() });
});

app.get('/rooms', (_req, res) => {
  res.json({ rooms: openRooms() });
});

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, never, SocketData>(server, {
  cors: { origin: origins, credentials: true },
});

function readProfile(raw: unknown): PlayerProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const { id, name } = raw as Record<string, unknown>;
  if (typeof id !== 'string' || id.length === 0) return null;
  return { id, name: typeof name === 'string' && name ? name.slice(0, 20) : 'player' };
}

io.use((socket, next) => {
  const profile = readProfile(socket.handshake.auth?.profile);
  if (!profile) return next(new Error('missing profile'));

  socket.data.profile = profile;
  socket.data.roomCode = null;
  next();
});

const ROUND_BREAK = 5000;

function push(room: Room | null) {
  if (!room) return;
  for (const { socketId, userId } of playerSockets(room)) {
    io.to(socketId).emit('room:state', serialize(room, userId));
  }
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
  }, ROUND_BREAK);
}

io.on('connection', (socket) => {
  const profile = socket.data.profile as PlayerProfile;
  console.log('connected', profile.id, socket.id);

  socket.on('room:create', (config, ack) => {
    const room = createRoom(profile, socket.id, config ?? {});
    socket.join(room.code);
    socket.data.roomCode = room.code;
    push(room);
    ack({ ok: true, data: { code: room.code } });
  });

  socket.on('room:join', (code, ack) => {
    const result = joinRoom(String(code ?? '').trim(), profile, socket.id);
    if (!result.ok) return ack({ ok: false, error: result.error });

    socket.join(result.room.code);
    socket.data.roomCode = result.room.code;
    push(result.room);
    ack({ ok: true, data: { code: result.room.code } });
  });

  socket.on('room:ready', (ready, ack) => {
    const code = socket.data.roomCode;
    if (!code) return ack({ ok: false, error: 'not in a room' });

    const room = setReady(code, profile.id, Boolean(ready));
    if (room && room.phase === 'lobby' && everyoneReady(room)) {
      startRound(room);
      io.to(room.code).emit('game:roundStart', room.round);
    }

    push(room);
    ack({ ok: true, data: null });
  });

  socket.on('game:guess', (word, ack) => {
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
    const code = socket.data.roomCode;
    if (!code) return ack({ ok: true, data: null });

    const room = leaveRoom(code, profile.id);
    socket.leave(code);
    socket.data.roomCode = null;
    push(room);
    ack({ ok: true, data: null });

    if (room && room.phase === 'playing' && roundIsOver(room)) finishRound(room);
  });

  socket.on('disconnect', () => {
    console.log('disconnected', profile.id, socket.id);

    const room = markDisconnected(socket.id);
    push(room);

    if (room && room.phase === 'playing' && roundIsOver(room)) finishRound(room);
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
  for (const code of sweepEmptyRooms()) {
    io.to(code).emit('room:closed', 'room closed after being empty');
    console.log('closed empty room', code);
  }
}, 30_000);

server.listen(port, () => {
  console.log(`server on http://localhost:${port}`);
});
