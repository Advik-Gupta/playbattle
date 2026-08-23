import { randomInt, randomUUID } from 'node:crypto';
import type {
  BracketMatch,
  BracketSeat,
  GameId,
  PlayerProfile,
  TournamentPhase,
  TournamentState,
} from './protocol.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;
const IDLE_TTL = 30 * 60 * 1000;

interface Tournament {
  code: string;
  hostId: string;
  game: GameId;
  size: number;
  phase: TournamentPhase;
  players: Map<string, BracketSeat>;
  rounds: BracketMatch[][];
  championId: string | null;
  touchedAt: number;
}

const tournaments = new Map<string, Tournament>();
const roomToMatch = new Map<string, { code: string; matchId: string }>();

function makeCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) code += ALPHABET[randomInt(ALPHABET.length)];
  return tournaments.has(code) ? makeCode() : code;
}

function seatOf(profile: PlayerProfile): BracketSeat {
  return { userId: profile.id, name: profile.name, avatar: profile.avatar };
}

export function getTournament(code: string) {
  return tournaments.get(code.toUpperCase());
}

export function createTournament(profile: PlayerProfile, game: GameId, size: number) {
  const seats = size === 8 ? 8 : 4;

  const tournament: Tournament = {
    code: makeCode(),
    hostId: profile.id,
    game,
    size: seats,
    phase: 'lobby',
    players: new Map([[profile.id, seatOf(profile)]]),
    rounds: [],
    championId: null,
    touchedAt: Date.now(),
  };

  tournaments.set(tournament.code, tournament);
  return tournament;
}

export function joinTournament(code: string, profile: PlayerProfile) {
  const tournament = getTournament(code);
  if (!tournament) return { ok: false, error: 'tournament not found' } as const;
  if (tournament.phase !== 'lobby') return { ok: false, error: 'it already started' } as const;
  if (tournament.players.has(profile.id)) return { ok: true, tournament } as const;
  if (tournament.players.size >= tournament.size) {
    return { ok: false, error: 'it is full' } as const;
  }

  tournament.players.set(profile.id, seatOf(profile));
  tournament.touchedAt = Date.now();

  return { ok: true, tournament } as const;
}

export function leaveTournament(code: string, userId: string) {
  const tournament = getTournament(code);
  if (!tournament) return null;
  if (tournament.phase !== 'lobby') return tournament;

  tournament.players.delete(userId);
  tournament.touchedAt = Date.now();

  if (tournament.players.size === 0) {
    tournaments.delete(tournament.code);
    return null;
  }

  if (tournament.hostId === userId) {
    const next = tournament.players.values().next().value;
    if (next?.userId) tournament.hostId = next.userId;
  }

  return tournament;
}

function shuffled<T>(items: T[]) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export function startTournament(code: string, userId: string) {
  const tournament = getTournament(code);
  if (!tournament) return { ok: false, error: 'tournament not found' } as const;
  if (tournament.hostId !== userId) return { ok: false, error: 'only the host can start' } as const;
  if (tournament.phase !== 'lobby') return { ok: false, error: 'already started' } as const;
  if (tournament.players.size < 2) return { ok: false, error: 'need at least two players' } as const;

  const seats = shuffled([...tournament.players.values()]);
  while (seats.length < tournament.size) seats.push(null as unknown as BracketSeat);

  const totalRounds = Math.log2(tournament.size);
  tournament.rounds = [];

  for (let round = 0; round < totalRounds; round += 1) {
    const count = tournament.size / 2 ** (round + 1);
    const matches: BracketMatch[] = [];

    for (let slot = 0; slot < count; slot += 1) {
      matches.push({
        id: randomUUID(),
        round,
        slot,
        seats: [null, null],
        winnerId: null,
        roomCode: null,
        done: false,
      });
    }

    tournament.rounds.push(matches);
  }

  tournament.rounds[0].forEach((match, index) => {
    match.seats = [seats[index * 2] ?? null, seats[index * 2 + 1] ?? null];
  });

  tournament.phase = 'running';
  tournament.touchedAt = Date.now();

  settleByes(tournament);
  return { ok: true, tournament } as const;
}

function settleByes(tournament: Tournament) {
  settleRound(tournament, 0);
}

export function pendingMatches(tournament: Tournament) {
  for (const round of tournament.rounds) {
    const ready = round.filter(
      (match) => !match.done && match.seats[0] && match.seats[1] && !match.roomCode,
    );

    if (ready.length > 0) return ready;
    if (round.some((match) => !match.done)) return [];
  }

  return [];
}

export function attachRoom(code: string, matchId: string, roomCode: string) {
  const tournament = getTournament(code);
  if (!tournament) return;

  for (const round of tournament.rounds) {
    const match = round.find((entry) => entry.id === matchId);
    if (!match) continue;

    match.roomCode = roomCode;
    roomToMatch.set(roomCode, { code: tournament.code, matchId });
    return;
  }
}

export function matchForRoom(roomCode: string) {
  return roomToMatch.get(roomCode) ?? null;
}

export function reportWinner(roomCode: string, winnerId: string | null) {
  const link = roomToMatch.get(roomCode);
  if (!link) return null;

  const tournament = getTournament(link.code);
  if (!tournament) return null;

  for (const round of tournament.rounds) {
    const match = round.find((entry) => entry.id === link.matchId);
    if (!match) continue;

    const fallback = match.seats[0]?.userId ?? null;
    advance(tournament, match, winnerId ?? fallback);
    roomToMatch.delete(roomCode);

    return tournament;
  }

  return null;
}

function advance(tournament: Tournament, match: BracketMatch, winnerId: string | null) {
  match.winnerId = winnerId;
  match.done = true;
  tournament.touchedAt = Date.now();

  const seat = match.seats.find((entry) => entry?.userId === winnerId) ?? null;
  const next = tournament.rounds[match.round + 1];

  if (!next) {
    tournament.phase = 'finished';
    tournament.championId = winnerId;
    return;
  }

  const target = next[Math.floor(match.slot / 2)];
  if (!target || target.done) return;

  target.seats[match.slot % 2] = seat;

  if (!isRoundDone(tournament, match.round)) return;

  settleRound(tournament, match.round + 1);
}

function settleRound(tournament: Tournament, index: number) {
  const round = tournament.rounds[index];
  if (!round) return;

  for (const match of [...round]) {
    if (match.done) continue;

    const [left, right] = match.seats;
    if (left && right) continue;

    advance(tournament, match, left?.userId ?? right?.userId ?? null);
  }
}

function isRoundDone(tournament: Tournament, round: number) {
  return tournament.rounds[round]?.every((match) => match.done) ?? false;
}

export function serializeTournament(tournament: Tournament): TournamentState {
  return {
    code: tournament.code,
    hostId: tournament.hostId,
    game: tournament.game,
    size: tournament.size,
    phase: tournament.phase,
    players: [...tournament.players.values()],
    rounds: tournament.rounds,
    championId: tournament.championId,
  };
}

export function memberIds(tournament: Tournament) {
  return [...tournament.players.keys()];
}

export function tournamentOf(userId: string) {
  for (const tournament of tournaments.values()) {
    if (tournament.players.has(userId)) return tournament;
  }

  return null;
}

export function sweepTournaments() {
  const cutoff = Date.now() - IDLE_TTL;
  const closed: string[] = [];

  for (const [code, tournament] of tournaments) {
    if (tournament.touchedAt < cutoff) {
      tournaments.delete(code);
      closed.push(code);
    }
  }

  return closed;
}

export function tournamentCount() {
  return tournaments.size;
}

export type { Tournament };
