import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { Server } from 'socket.io';

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
  res.json({ ok: true, uptime: Math.round(process.uptime()) });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: origins, credentials: true },
});

io.on('connection', (socket) => {
  console.log('connected', socket.id);

  socket.on('ping', (ack) => {
    if (typeof ack === 'function') ack({ ok: true, at: Date.now() });
  });

  socket.on('disconnect', () => {
    console.log('disconnected', socket.id);
  });
});

server.listen(port, () => {
  console.log(`server on http://localhost:${port}`);
});
