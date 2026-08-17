import { randomInt, randomUUID } from 'node:crypto';
import {
  CONFIG_LIMITS,
  DEFAULT_CONFIG,
  MAX_HINTS,
  MAX_ROOM_PLAYERS,
  ROOM_CODE_LENGTH,
  SOLO_CONFIG,
  VOTEKICK_MS,
  WORD_LENGTH,
  type HintReveal,
  type OwnGuess,
  type PlayerProfile,
  type PlayerView,
  type RoomConfig,
  type RoomPhase,
  type RoomState,
  type OpenRoom,
  type RoundSummary,
  type VoteKick,
  type Tile,
} from './protocol.js';
import { mergeKeyboard, pointsFor, scoreGuess, solved } from './game.js';
import { isWord, randomWord } from './words.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const EMPTY_ROOM_TTL = 3 * 60 * 1000;

interface Player {
  profile: PlayerProfile;
  socketId: string | null;
  ready: boolean;
  score: number;
  leftAt: number | null;
  guesses: OwnGuess[];
  keyboard: Record<string, Tile>;
  solved: boolean;
  solveMs: number | null;
  place: number | null;
  hints: HintReveal[];
  resigned: boolean;
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
  answer: string | null;
  roundStartedAt: number | null;
  usedAnswers: string[];
  history: RoundSummary[];
  matchWinnerId: string | null;
  matchId: string;
  votekicks: VoteKick[];
  banned: Set<string>;
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
  if (input.mode === 'solo') return { ...SOLO_CONFIG };

  return {
    mode: 'race',
    rounds: pick(CONFIG_LIMITS.rounds, input.rounds, DEFAULT_CONFIG.rounds),
    secondsPerRound: pick(
      CONFIG_LIMITS.secondsPerRound,
      input.secondsPerRound,
      DEFAULT_CONFIG.secondsPerRound,
    ),
    maxGuesses: pick(CONFIG_LIMITS.maxGuesses, input.maxGuesses, DEFAULT_CONFIG.maxGuesses),
    maxPlayers: pick(CONFIG_LIMITS.maxPlayers, input.maxPlayers, DEFAULT_CONFIG.maxPlayers),
    visibility: input.visibility === 'open' ? 'open' : DEFAULT_CONFIG.visibility,
  };
}

function blankPlayer(profile: PlayerProfile, socketId: string | null): Player {
  return {
    profile,
    socketId,
    ready: false,
    score: 0,
    leftAt: null,
    guesses: [],
    keyboard: {},
    solved: false,
    solveMs: null,
    place: null,
    hints: [],
    resigned: false,
  };
}

function resetBoards(room: Room) {
  for (const player of room.players.values()) {
    player.guesses = [];
    player.keyboard = {};
    player.solved = false;
    player.solveMs = null;
    player.place = null;
    player.hints = [];
    player.resigned = false;
  }
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
    answer: null,
    roundStartedAt: null,
    usedAnswers: [],
    history: [],
    matchWinnerId: null,
    matchId: randomUUID(),
    votekicks: [],
    banned: new Set<string>(),
  };

  room.players.set(profile.id, blankPlayer(profile, socketId));

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
  if (room.banned.has(profile.id)) return { ok: false, error: 'you were removed from this room' };

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

  room.players.set(profile.id, blankPlayer(profile, socketId));
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

export function timedOut(room: Room) {
  return room.phase === 'playing' && room.deadline !== null && room.deadline <= Date.now();
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

export function openRooms(): OpenRoom[] {
  return [...rooms.values()]
    .filter(
      (room) =>
        room.config.visibility === 'open' &&
        room.config.mode !== 'solo' &&
        room.phase === 'lobby' &&
        room.players.size > 0 &&
        room.players.size < room.config.maxPlayers,
    )
    .map((room) => ({
      code: room.code,
      hostName: room.players.get(room.hostId)?.profile.name ?? 'someone',
      players: room.players.size,
      maxPlayers: room.config.maxPlayers,
      rounds: room.config.rounds,
      secondsPerRound: room.config.secondsPerRound,
    }));
}

export function serialize(room: Room, viewerId: string): RoomState {
  const viewer = room.players.get(viewerId);
  const roundDone = room.phase === 'round_over' || room.phase === 'match_over';
  const viewerFinished =
    viewer !== undefined &&
    (viewer.solved || viewer.guesses.length >= room.config.maxGuesses);

  const players: PlayerView[] = [...room.players.values()].map((player) => {
    const own = player.profile.id === viewerId;

    return {
      profile: player.profile,
      connected: player.socketId !== null,
      ready: player.ready,
      score: player.score,
      guesses: own || roundDone ? player.guesses : null,
      maskedGuesses: player.guesses.map((guess) => ({ tiles: guess.tiles })),
      keyboard: own ? player.keyboard : null,
      solved: player.solved,
      solveMs: player.solveMs,
      outOfGuesses: player.guesses.length >= room.config.maxGuesses,
      resigned: player.resigned,
      place: player.place,
      hints: own ? player.hints : null,
    };
  });

  return {
    code: room.code,
    hostId: room.hostId,
    config: room.config,
    phase: room.phase,
    round: room.round,
    players,
    deadline: room.deadline,
    now: Date.now(),
    history: room.history,
    answer: roundDone || viewerFinished ? room.answer : null,
    matchWinnerId: room.matchWinnerId,
    votekicks: room.votekicks,
  };
}

export function playerSockets(room: Room) {
  return [...room.players.values()]
    .filter((player) => player.socketId !== null)
    .map((player) => ({ socketId: player.socketId as string, userId: player.profile.id }));
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

const ABSENT_TTL = 60_000;

export function reapAbsent(room: Room) {
  if (room.phase !== 'lobby') return [];

  const cutoff = Date.now() - ABSENT_TTL;
  const dropped: string[] = [];

  for (const [userId, player] of room.players) {
    if (player.socketId !== null) continue;
    if (player.leftAt !== null && player.leftAt < cutoff) {
      room.players.delete(userId);
      dropped.push(userId);
    }
  }

  if (dropped.length > 0 && room.players.size > 0 && !room.players.has(room.hostId)) {
    const next = room.players.values().next().value;
    if (next) room.hostId = next.profile.id;
  }

  if (room.players.size === 0) room.emptySince = Date.now();

  return dropped;
}

export function allRoomCodes() {
  return [...rooms.keys()];
}

export function roomCount() {
  return rooms.size;
}

export function everyoneReady(room: Room) {
  const active = [...room.players.values()].filter((p) => p.socketId !== null);
  const needed = room.config.mode === 'solo' ? 1 : 2;
  return active.length >= needed && active.every((p) => p.ready);
}

export function createSolo(profile: PlayerProfile, socketId: string, config: Partial<RoomConfig>) {
  const room = createRoom(profile, socketId, { ...config, mode: 'solo' });
  startRound(room);
  return room;
}

export function takeHint(code: string, userId: string) {
  const room = getRoom(code);
  if (!room) return { ok: false, error: 'room not found' } as const;
  if (room.config.mode !== 'solo') return { ok: false, error: 'hints are solo only' } as const;
  if (room.phase !== 'playing') return { ok: false, error: 'no round running' } as const;

  const player = room.players.get(userId);
  if (!player) return { ok: false, error: 'not in this room' } as const;
  if (player.solved) return { ok: false, error: 'already solved' } as const;
  if (player.hints.length >= MAX_HINTS) return { ok: false, error: 'no hints left' } as const;

  const answer = room.answer ?? '';
  const taken = new Set(player.hints.map((hint) => hint.index));
  const options = [...answer]
    .map((letter, index) => ({ index, letter }))
    .filter((slot) => !taken.has(slot.index));

  if (options.length === 0) return { ok: false, error: 'nothing left to reveal' } as const;

  const hint = options[randomInt(options.length)];
  player.hints.push(hint);

  return { ok: true, room, hint } as const;
}

export function startRound(room: Room) {
  room.round += 1;
  room.answer = randomWord(room.usedAnswers);
  room.usedAnswers.push(room.answer);
  room.phase = 'playing';
  room.roundStartedAt = Date.now();
  room.deadline =
    room.config.secondsPerRound > 0 ? Date.now() + room.config.secondsPerRound * 1000 : null;

  resetBoards(room);
  return room;
}

export function submitGuess(code: string, userId: string, raw: string) {
  const room = getRoom(code);
  if (!room) return { ok: false, error: 'room not found' } as const;
  if (room.phase !== 'playing') return { ok: false, error: 'no round running' } as const;

  const player = room.players.get(userId);
  if (!player) return { ok: false, error: 'not in this room' } as const;
  if (player.solved) return { ok: false, error: 'already solved' } as const;
  if (player.resigned) return { ok: false, error: 'you skipped this word' } as const;
  if (player.guesses.length >= room.config.maxGuesses) {
    return { ok: false, error: 'out of guesses' } as const;
  }

  const word = String(raw ?? '').trim().toLowerCase();
  if (word.length !== WORD_LENGTH) return { ok: false, error: 'needs five letters' } as const;
  if (!isWord(word)) return { ok: false, error: 'not in the word list' } as const;

  const tiles = scoreGuess(word, room.answer as string);
  player.guesses.push({ word, tiles });
  player.keyboard = mergeKeyboard(player.keyboard, word, tiles);

  if (solved(tiles)) {
    player.solved = true;
    player.solveMs = Date.now() - (room.roundStartedAt ?? Date.now());
    player.place = [...room.players.values()].filter((p) => p.solved).length;
    player.score += pointsFor(player.place, player.guesses.length);
  }

  return { ok: true, room, done: roundIsOver(room) } as const;
}

export function roundIsOver(room: Room) {
  const active = [...room.players.values()].filter((player) => player.socketId !== null);
  if (active.length === 0) return true;

  return active.every(
    (player) =>
      player.solved || player.resigned || player.guesses.length >= room.config.maxGuesses,
  );
}

export function endRound(room: Room): RoundSummary {
  const winner = [...room.players.values()]
    .filter((p) => p.solved)
    .sort((a, b) => (a.solveMs ?? 0) - (b.solveMs ?? 0))[0];

  const summary: RoundSummary = {
    round: room.round,
    answer: room.answer ?? '',
    winnerId: winner?.profile.id ?? null,
    boards: [...room.players.values()].map((player) => ({
      playerId: player.profile.id,
      guesses: player.guesses,
      solved: player.solved,
      solveMs: player.solveMs,
      hints: player.hints.length,
    })),
  };

  room.history.push(summary);
  room.deadline = null;

  if (room.round >= room.config.rounds) {
    room.phase = 'match_over';
    const ranked = [...room.players.values()].sort((a, b) => b.score - a.score);
    const tied = ranked.length > 1 && ranked[0].score === ranked[1].score;
    room.matchWinnerId = tied ? null : (ranked[0]?.profile.id ?? null);
  } else {
    room.phase = 'round_over';
  }

  return summary;
}

export function rematch(code: string, userId: string) {
  const room = getRoom(code);
  if (!room) return { ok: false, error: 'room not found' } as const;
  if (room.phase !== 'match_over') return { ok: false, error: 'match still running' } as const;
  if (room.hostId !== userId) return { ok: false, error: 'only the host can restart' } as const;

  room.phase = 'lobby';
  room.round = 0;
  room.answer = null;
  room.history = [];
  room.usedAnswers = [];
  room.matchWinnerId = null;
  room.matchId = randomUUID();
  resetBoards(room);
  for (const player of room.players.values()) {
    player.score = 0;
    player.ready = false;
  }

  return { ok: true, room } as const;
}

export function resign(code: string, userId: string) {
  const room = getRoom(code);
  if (!room) return { ok: false, error: 'room not found' } as const;
  if (room.phase !== 'playing') return { ok: false, error: 'no round running' } as const;

  const player = room.players.get(userId);
  if (!player) return { ok: false, error: 'not in this room' } as const;
  if (player.solved) return { ok: false, error: 'already solved' } as const;
  if (player.resigned) return { ok: false, error: 'already skipped' } as const;

  player.resigned = true;
  return { ok: true, room, done: roundIsOver(room) } as const;
}

function pruneVotes(room: Room) {
  const now = Date.now();
  room.votekicks = room.votekicks.filter(
    (vote) => vote.expiresAt > now && room.players.has(vote.targetId),
  );
}

export function votekick(code: string, voterId: string, targetId: string) {
  const room = getRoom(code);
  if (!room) return { ok: false, error: 'room not found' } as const;
  if (voterId === targetId) return { ok: false, error: 'you cannot vote yourself out' } as const;

  const target = room.players.get(targetId);
  if (!target) return { ok: false, error: 'they are not here' } as const;
  if (room.players.size < 3) return { ok: false, error: 'need three players to vote' } as const;

  pruneVotes(room);

  const required = Math.max(2, Math.ceil((room.players.size - 1) / 2));
  let vote = room.votekicks.find((entry) => entry.targetId === targetId);

  if (!vote) {
    vote = {
      targetId,
      targetName: target.profile.name,
      votes: [],
      required,
      expiresAt: Date.now() + VOTEKICK_MS,
    };
    room.votekicks.push(vote);
  }

  vote.required = required;
  if (!vote.votes.includes(voterId)) vote.votes.push(voterId);

  if (vote.votes.length >= vote.required) {
    room.votekicks = room.votekicks.filter((entry) => entry.targetId !== targetId);
    return { ok: true, room, kicked: targetId } as const;
  }

  return { ok: true, room, kicked: null } as const;
}

export function removePlayer(code: string, hostId: string, targetId: string) {
  const room = getRoom(code);
  if (!room) return { ok: false, error: 'room not found' } as const;
  if (room.hostId !== hostId) return { ok: false, error: 'only the host can remove people' } as const;
  if (hostId === targetId) return { ok: false, error: 'you cannot remove yourself' } as const;
  if (!room.players.has(targetId)) return { ok: false, error: 'they are not here' } as const;

  return { ok: true, room, kicked: targetId } as const;
}

export function banAndDrop(room: Room, targetId: string) {
  room.banned.add(targetId);
  room.players.delete(targetId);
  room.votekicks = room.votekicks.filter((vote) => vote.targetId !== targetId);

  if (room.players.size === 0) {
    room.emptySince = Date.now();
    return;
  }

  if (room.hostId === targetId) {
    const next = room.players.values().next().value;
    if (next) room.hostId = next.profile.id;
  }
}

interface Waiting {
  profile: PlayerProfile;
  socketId: string;
  since: number;
}

const queue: Waiting[] = [];

export function joinQueue(profile: PlayerProfile, socketId: string) {
  leaveQueue(profile.id);

  const opponent = queue.shift();

  if (!opponent) {
    queue.push({ profile, socketId, since: Date.now() });
    return { waiting: true } as const;
  }

  const room = createRoom(opponent.profile, opponent.socketId, {
    mode: 'race',
    rounds: 3,
    secondsPerRound: 120,
    maxGuesses: 6,
    maxPlayers: 2,
    visibility: 'private',
  });

  room.players.set(profile.id, blankPlayer(profile, socketId));

  return { waiting: false, room, opponent } as const;
}

export function leaveQueue(userId: string) {
  const index = queue.findIndex((entry) => entry.profile.id === userId);
  if (index === -1) return false;

  queue.splice(index, 1);
  return true;
}

export function queueSize() {
  return queue.length;
}
