import { randomInt } from 'node:crypto';
import {
  CONFIG_LIMITS,
  DEFAULT_CONFIG,
  MAX_ROOM_PLAYERS,
  ROOM_CODE_LENGTH,
  type PlayerProfile,
  type PlayerView,
  type RoomConfig,
  type RoomPhase,
  type RoomState,
} from './protocol.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const EMPTY_ROOM_TTL = 3 * 60 * 1000;

interface Player {
  profile: PlayerProfile;
  socketId: string | null;
  ready: boolean;
  score: number;
  leftAt: number | null;
}

export interface Room {
  code: string;
  hostId: string;
  config: RoomConfig;
  phase: RoomPhase;
  round: number;
  players: Map<string, Player>;
  deadline: number | null;
  emptySince: number | null;
}

export type RoomResult = { ok: true; room: Room } | { ok: false; error: string };

const rooms = new Map<string, Room>();

function makeCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return rooms.has(code) ? makeCode() : code;
}

function pick<T extends number>(allowed: readonly T[], value: unknown, fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function sanitizeConfig(input: Partial<RoomConfig> = {}): RoomConfig {
  return {
    rounds: pick(CONFIG_LIMITS.rounds, input.rounds, DEFAULT_CONFIG.rounds),
    secondsPerRound: pick(
      CONFIG_LIMITS.secondsPerRound,
      input.secondsPerRound,
      DEFAULT_CONFIG.secondsPerRound,
    ),
    maxPlayers: pick(CONFIG_LIMITS.maxPlayers, input.maxPlayers, DEFAULT_CONFIG.maxPlayers),
    visibility: input.visibility === 'open' ? 'open' : DEFAULT_CONFIG.visibility,
  };
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function createRoom(profile: PlayerProfile, socketId: string, config: Partial<RoomConfig>) {
  const room: Room = {
    code: makeCode(),
    hostId: profile.id,
    config: sanitizeConfig(config),
    phase: 'lobby',
    round: 0,
    players: new Map(),
    deadline: null,
    emptySince: null,
  };

  room.players.set(profile.id, {
    profile,
    socketId,
    ready: false,
    score: 0,
    leftAt: null,
  });

  rooms.set(room.code, room);
  return room;
}

export function joinRoom(
  code: string,
  profile: PlayerProfile,
  socketId: string,
): RoomResult {
  const room = getRoom(code);
  if (!room) return { ok: false, error: 'room not found' };

  const existing = room.players.get(profile.id);
  if (existing) {
    existing.socketId = socketId;
    existing.profile = profile;
    existing.leftAt = null;
    room.emptySince = null;
    return { ok: true, room };
  }

  if (room.phase !== 'lobby') return { ok: false, error: 'match already started' };

  const seats = Math.min(room.config.maxPlayers, MAX_ROOM_PLAYERS);
  if (room.players.size >= seats) return { ok: false, error: 'room is full' };

  room.players.set(profile.id, {
    profile,
    socketId,
    ready: false,
    score: 0,
    leftAt: null,
  });
  room.emptySince = null;

  return { ok: true, room };
}

export function leaveRoom(code: string, userId: string) {
  const room = getRoom(code);
  if (!room) return null;

  room.players.delete(userId);

  if (room.players.size === 0) {
    room.emptySince = Date.now();
    return room;
  }

  if (room.hostId === userId) {
    const next = room.players.values().next().value;
    if (next) room.hostId = next.profile.id;
  }

  return room;
}

export function markDisconnected(socketId: string) {
  for (const room of rooms.values()) {
    for (const player of room.players.values()) {
      if (player.socketId !== socketId) continue;

      player.socketId = null;
      player.leftAt = Date.now();
      player.ready = false;

      if ([...room.players.values()].every((p) => p.socketId === null)) {
        room.emptySince = Date.now();
      }

      return room;
    }
  }
  return null;
}

export function setReady(code: string, userId: string, ready: boolean) {
  const room = getRoom(code);
  const player = room?.players.get(userId);
  if (!room || !player) return null;

  player.ready = ready;
  return room;
}

export function setConfig(
  code: string,
  userId: string,
  config: Partial<RoomConfig>,
): RoomResult {
  const room = getRoom(code);
  if (!room) return { ok: false, error: 'room not found' };
  if (room.hostId !== userId) return { ok: false, error: 'only the host can change settings' };
  if (room.phase !== 'lobby') return { ok: false, error: 'match already started' };

  room.config = sanitizeConfig({ ...room.config, ...config });
  for (const player of room.players.values()) player.ready = false;

  return { ok: true, room };
}

export function openRooms() {
  return [...rooms.values()]
    .filter((room) => room.config.visibility === 'open' && room.phase === 'lobby')
    .map((room) => ({
      code: room.code,
      players: room.players.size,
      maxPlayers: room.config.maxPlayers,
      rounds: room.config.rounds,
    }));
}

export function serialize(room: Room): RoomState {
  const players: PlayerView[] = [...room.players.values()].map((player) => ({
    profile: player.profile,
    connected: player.socketId !== null,
    ready: player.ready,
    score: player.score,
  }));

  return {
    code: room.code,
    hostId: room.hostId,
    config: room.config,
    phase: room.phase,
    round: room.round,
    players,
    deadline: room.deadline,
    now: Date.now(),
  };
}

export function sweepEmptyRooms() {
  const cutoff = Date.now() - EMPTY_ROOM_TTL;
  const closed: string[] = [];

  for (const [code, room] of rooms) {
    if (room.emptySince !== null && room.emptySince < cutoff) {
      rooms.delete(code);
      closed.push(code);
    }
  }

  return closed;
}

export function roomCount() {
  return rooms.size;
}
