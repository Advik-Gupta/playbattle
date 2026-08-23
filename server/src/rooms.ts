import { randomInt, randomUUID } from 'node:crypto';
import { CPU_ID } from './protocol.js';
import {
  CONFIG_LIMITS,
  DEFAULT_CONFIG,
  MAX_HINTS,
  MAX_ROOM_PLAYERS,
  ROOM_CODE_LENGTH,
  ANAGRAM_CONFIG,
  DAILY_CONFIG,
  SOLO_CONFIG,
  TICTACTOE_CONFIG,
  TICTACTOE_SOLO_CONFIG,
  VOTEKICK_MS,
  WORD_LENGTH,
  type HintReveal,
  type OwnGuess,
  type PlayerProfile,
  type PlayerView,
  type RoomConfig,
  type RoomPhase,
  type RoomState,
  type GameId,
  type JoinRequest,
  type FoundWord,
  type OpenRoom,
  type RoundSummary,
  type TicTacToeState,
  type AnagramState,
  type VoteKick,
  type Tile,
} from './protocol.js';
import { gameFor } from './games/index.js';
import { mergeKeyboard, pointsFor, scoreGuess, solved } from './games/wordbattle.js';
import { applyMove, cpuMove, pointsForRound } from './games/tictactoe.js';
import { serializeAnagram, submitWord } from './games/anagram.js';
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
  found: FoundWord[];
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
  ttt: TicTacToeState | null;
  anagram: AnagramState | null;
  history: RoundSummary[];
  matchWinnerId: string | null;
  matchDraw: boolean;
  matchId: string;
  votekicks: VoteKick[];
  banned: Set<string>;
  joinRequests: JoinRequest[];
  invited: Set<string>;
  watchers: Set<string>;
}

export type RoomResult =
  | { ok: true; room: Room }
  | { ok: false; error: string; pending?: boolean };

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
  const game: GameId =
    input.game === 'tictactoe' || input.game === 'anagram' ? input.game : 'wordbattle';

  if (game === 'anagram') {
    const solo = input.mode === 'solo';

    return {
      game,
      mode: solo ? 'solo' : 'race',
      rounds: pick(CONFIG_LIMITS.rounds, input.rounds, ANAGRAM_CONFIG.rounds),
      secondsPerRound: pick(
        CONFIG_LIMITS.secondsPerRound,
        input.secondsPerRound,
        ANAGRAM_CONFIG.secondsPerRound,
      ),
      maxGuesses: 0,
      maxPlayers: solo ? 1 : pick(CONFIG_LIMITS.maxPlayers, input.maxPlayers, ANAGRAM_CONFIG.maxPlayers),
      visibility: input.visibility === 'open' ? 'open' : 'private',
    };
  }

  if (game === 'tictactoe') {
    const solo = input.mode === 'solo';

    return {
      game,
      mode: solo ? 'solo' : 'race',
      rounds: pick(CONFIG_LIMITS.rounds, input.rounds, TICTACTOE_CONFIG.rounds),
      secondsPerRound: pick(
        CONFIG_LIMITS.secondsPerRound,
        input.secondsPerRound,
        TICTACTOE_CONFIG.secondsPerRound,
      ),
      maxGuesses: 0,
      maxPlayers: solo ? TICTACTOE_SOLO_CONFIG.maxPlayers : TICTACTOE_CONFIG.maxPlayers,
      visibility: input.visibility === 'open' ? 'open' : 'private',
    };
  }

  if (input.mode === 'daily') return { ...DAILY_CONFIG };
  if (input.mode === 'solo') return { ...SOLO_CONFIG };

  return {
    game,
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
    found: [],
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
    player.found = [];
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
    ttt: null,
    anagram: null,
    history: [],
    matchWinnerId: null,
    matchDraw: false,
    matchId: randomUUID(),
    votekicks: [],
    banned: new Set<string>(),
    joinRequests: [],
    invited: new Set<string>(),
    watchers: new Set<string>(),
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

  if (room.config.visibility === 'private' && !room.invited.has(profile.id)) {
    const already = room.joinRequests.find((entry) => entry.userId === profile.id);

    if (!already) {
      room.joinRequests.push({
        userId: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        requestedAt: Date.now(),
      });
    }

    return { ok: false, error: 'waiting for the host', pending: true } as const;
  }

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
      game: room.config.game,
      hostName: room.players.get(room.hostId)?.profile.name ?? 'someone',
      players: room.players.size,
      maxPlayers: room.config.maxPlayers,
      rounds: room.config.rounds,
      secondsPerRound: room.config.secondsPerRound,
    }));
}

export function serialize(room: Room, viewerId: string): RoomState {
  const viewer = room.players.get(viewerId);
  const spectating = !viewer && room.watchers.has(viewerId);
  const roundDone = room.phase === 'round_over' || room.phase === 'match_over';
  const viewerFinished =
    viewer !== undefined &&
    (viewer.solved || viewer.resigned || viewer.guesses.length >= room.config.maxGuesses);

  const players: PlayerView[] = [...room.players.values()].map((player) => {
    const own = player.profile.id === viewerId;

    return {
      profile: player.profile,
      connected: player.socketId !== null,
      ready: player.ready,
      score: player.score,
      guesses: (own || roundDone) && !spectating ? player.guesses : roundDone ? player.guesses : null,
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
    answer: roundDone || (viewerFinished && !spectating) ? room.answer : null,
    matchWinnerId: room.matchWinnerId,
    matchDraw: room.matchDraw,
    votekicks: room.votekicks,
    joinRequests: room.hostId === viewerId ? room.joinRequests : [],
    watchers: room.watchers.size,
    spectating,
    ttt: room.ttt,
    anagram: serializeAnagram(room, viewerId),
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

export function roomOf(userId: string) {
  for (const room of rooms.values()) {
    if (room.players.has(userId)) return room;
  }

  return null;
}

export function reseat(room: Room, userId: string, socketId: string) {
  const player = room.players.get(userId);
  if (!player) return false;

  player.socketId = socketId;
  player.leftAt = null;
  room.emptySince = null;

  return true;
}

export function closeRoom(code: string) {
  return rooms.delete(code.toUpperCase());
}

export function allRoomCodes() {
  return [...rooms.keys()];
}

export function roomCount() {
  return rooms.size;
}

export function everyoneReady(room: Room) {
  const active = [...room.players.values()].filter((p) => p.socketId !== null);
  const needed = room.config.mode === 'race' ? 2 : 1;
  return active.length >= needed && active.every((p) => p.ready);
}

export function createSolo(profile: PlayerProfile, socketId: string, config: Partial<RoomConfig>) {
  const room = createRoom(profile, socketId, { ...config, mode: 'solo' });
  startRound(room);
  return room;
}

export function createDaily(profile: PlayerProfile, socketId: string, word: string) {
  const room = createRoom(profile, socketId, { mode: 'daily' });

  startRound(room);
  room.answer = word;
  room.usedAnswers = [word];

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
  room.phase = 'playing';
  room.roundStartedAt = Date.now();
  room.deadline =
    room.config.secondsPerRound > 0 ? Date.now() + room.config.secondsPerRound * 1000 : null;

  resetBoards(room);
  gameFor(room.config.game).startRound(room);

  return room;
}

export function submitGuess(code: string, userId: string, raw: string) {
  const room = getRoom(code);
  if (!room) return { ok: false, error: 'room not found' } as const;
  if (room.config.game !== 'wordbattle') return { ok: false, error: 'wrong game' } as const;
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
  if ([...room.players.values()].every((player) => player.socketId === null)) return true;

  return gameFor(room.config.game).isRoundOver(room);
}

export function endRound(room: Room): RoundSummary {
  const summary = gameFor(room.config.game).summarize(room);

  if (room.config.game === 'tictactoe') {
    for (const player of room.players.values()) {
      const won = summary.winnerId === player.profile.id;
      player.score += pointsForRound(won, summary.draw);
    }
  }

  room.history.push(summary);
  room.deadline = null;

  if (room.round >= room.config.rounds) {
    room.phase = 'match_over';

    if (room.config.mode === 'solo' && room.config.game === 'tictactoe') {
      const tally = new Map<string, number>();
      for (const past of room.history) {
        if (!past.winnerId) continue;
        tally.set(past.winnerId, (tally.get(past.winnerId) ?? 0) + 1);
      }

      const human = [...room.players.keys()][0] ?? null;
      const mine = human ? (tally.get(human) ?? 0) : 0;
      const theirs = tally.get(CPU_ID) ?? 0;

      room.matchDraw = mine === theirs;
      room.matchWinnerId = mine === theirs ? null : mine > theirs ? human : CPU_ID;
    } else {
      const ranked = [...room.players.values()].sort((a, b) => b.score - a.score);
      const tied = ranked.length > 1 && ranked[0].score === ranked[1].score;

      room.matchDraw = tied || ranked.length === 0;
      room.matchWinnerId = tied ? null : (ranked[0]?.profile.id ?? null);
    }
  } else {
    room.phase = 'round_over';
  }

  return summary;
}

export function playWord(code: string, userId: string, word: string) {
  const room = getRoom(code);
  if (!room) return { ok: false, error: 'room not found' } as const;
  if (room.config.game !== 'anagram') return { ok: false, error: 'wrong game' } as const;
  if (room.phase !== 'playing') return { ok: false, error: 'no round running' } as const;

  const result = submitWord(room, userId, word);
  if (!result.ok) return { ok: false, error: result.error } as const;

  return { ok: true, room, found: result.found } as const;
}

export function makeMove(code: string, userId: string, index: number) {
  const room = getRoom(code);
  if (!room) return { ok: false, error: 'room not found' } as const;
  if (room.config.game !== 'tictactoe') return { ok: false, error: 'wrong game' } as const;
  if (room.phase !== 'playing') return { ok: false, error: 'no round running' } as const;
  if (!room.players.has(userId)) return { ok: false, error: 'not in this room' } as const;

  const result = applyMove(room, userId, index);
  if (!result.ok) return { ok: false, error: result.error } as const;

  return { ok: true, room, done: result.decided } as const;
}

export function takeCpuTurn(code: string) {
  const room = getRoom(code);
  if (!room || room.config.mode !== 'solo' || room.config.game !== 'tictactoe') return null;
  if (room.phase !== 'playing') return null;

  const index = cpuMove(room);
  if (index === null) return null;

  const result = applyMove(room, CPU_ID, index);
  if (!result.ok) return null;

  return { room, done: result.decided };
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
  room.matchDraw = false;
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
  if (room.config.game === 'tictactoe') {
    return { ok: false, error: 'you cannot pass a turn game' } as const;
  }
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

const queues = new Map<GameId, Waiting[]>();

function queueFor(game: GameId) {
  const existing = queues.get(game);
  if (existing) return existing;

  const fresh: Waiting[] = [];
  queues.set(game, fresh);
  return fresh;
}

export function joinQueue(profile: PlayerProfile, socketId: string, game: GameId) {
  leaveQueue(profile.id);

  const queue = queueFor(game);
  const opponent = queue.shift();

  if (!opponent) {
    queue.push({ profile, socketId, since: Date.now() });
    return { waiting: true } as const;
  }

  const room = createRoom(opponent.profile, opponent.socketId, {
    game,
    mode: 'race',
    visibility: 'private',
  });

  room.players.set(profile.id, blankPlayer(profile, socketId));

  return { waiting: false, room, opponent } as const;
}

export function leaveQueue(userId: string) {
  let removed = false;

  for (const queue of queues.values()) {
    const index = queue.findIndex((entry) => entry.profile.id === userId);
    if (index === -1) continue;

    queue.splice(index, 1);
    removed = true;
  }

  return removed;
}

export function queueSize() {
  let total = 0;
  for (const queue of queues.values()) total += queue.length;
  return total;
}

export function allowJoin(code: string, userId: string) {
  const room = getRoom(code);
  if (!room) return false;

  room.invited.add(userId);
  room.banned.delete(userId);
  return true;
}

export function respondToJoin(code: string, hostId: string, userId: string, accept: boolean) {
  const room = getRoom(code);
  if (!room) return { ok: false, error: 'room not found' } as const;
  if (room.hostId !== hostId) return { ok: false, error: 'only the host decides' } as const;

  const request = room.joinRequests.find((entry) => entry.userId === userId);
  if (!request) return { ok: false, error: 'no request from them' } as const;

  room.joinRequests = room.joinRequests.filter((entry) => entry.userId !== userId);
  if (accept) room.invited.add(userId);

  return { ok: true, room, request, accepted: accept } as const;
}

export function dropJoinRequest(code: string, userId: string) {
  const room = getRoom(code);
  if (!room) return;

  room.joinRequests = room.joinRequests.filter((entry) => entry.userId !== userId);
}

export function watchRoom(code: string, userId: string) {
  const room = getRoom(code);
  if (!room) return { ok: false, error: 'room not found' } as const;
  if (room.players.has(userId)) return { ok: false, error: 'you are playing in it' } as const;
  if (room.config.mode === 'solo' || room.config.mode === 'daily') {
    return { ok: false, error: 'that game is private' } as const;
  }
  if (room.banned.has(userId)) return { ok: false, error: 'you were removed from this room' } as const;
  if (room.watchers.size >= 20) return { ok: false, error: 'too many people watching' } as const;

  room.watchers.add(userId);
  return { ok: true, room } as const;
}

export function unwatchRoom(code: string, userId: string) {
  const room = getRoom(code);
  if (!room) return null;

  room.watchers.delete(userId);
  return room;
}

export function watcherIds(room: Room) {
  return [...room.watchers];
}

export function forgetWatcher(userId: string) {
  for (const room of rooms.values()) room.watchers.delete(userId);
}
