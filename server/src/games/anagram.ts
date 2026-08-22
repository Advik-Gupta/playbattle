import { ANAGRAM_MIN_LENGTH, type AnagramState, type RoundSummary } from '../protocol.js';
import type { Room } from '../rooms.js';
import {
  bestPossible,
  canBuild,
  isAnagramWord,
  pointsFor,
  randomPool,
} from './anagram-words.js';
import type { GameModule } from './types.js';

export function submitWord(room: Room, userId: string, raw: string) {
  const state = room.anagram;
  if (!state) return { ok: false, error: 'no pool yet' } as const;

  const player = room.players.get(userId);
  if (!player) return { ok: false, error: 'not in this room' } as const;
  if (player.resigned) return { ok: false, error: 'you already passed' } as const;

  const word = String(raw ?? '').trim().toLowerCase();
  if (word.length < ANAGRAM_MIN_LENGTH) {
    return { ok: false, error: `at least ${ANAGRAM_MIN_LENGTH} letters` } as const;
  }
  if (!/^[a-z]+$/.test(word)) return { ok: false, error: 'letters only' } as const;
  if (!canBuild(word, state.pool)) return { ok: false, error: 'not in the pool' } as const;
  if (!isAnagramWord(word)) return { ok: false, error: 'not in the word list' } as const;
  if (player.found.some((entry) => entry.word === word)) {
    return { ok: false, error: 'already found' } as const;
  }

  const points = pointsFor(word);
  player.found.push({ word, points });
  player.score += points;

  return { ok: true, found: { word, points } } as const;
}

export const anagram: GameModule = {
  id: 'anagram',

  startRound(room) {
    const pool = randomPool();

    room.answer = null;
    room.ttt = null;
    room.anagram = {
      pool,
      found: null,
      counts: {},
      best: bestPossible(pool),
    };
  },

  isRoundOver(room) {
    const active = [...room.players.values()].filter((player) => player.socketId !== null);
    if (active.length === 0) return true;

    return active.every((player) => player.resigned);
  },

  summarize(room): RoundSummary {
    const ranked = [...room.players.values()].sort(
      (a, b) => roundPoints(b) - roundPoints(a) || a.found.length - b.found.length,
    );

    const top = ranked[0];
    const tied = ranked.length > 1 && roundPoints(ranked[1]) === roundPoints(top);

    return {
      round: room.round,
      answer: '',
      pool: room.anagram?.pool.join('') ?? '',
      winnerId: !top || tied || roundPoints(top) === 0 ? null : top.profile.id,
      draw: !top || tied || roundPoints(top) === 0,
      boards: [...room.players.values()].map((player) => ({
        playerId: player.profile.id,
        guesses: player.found.map((entry) => ({ word: entry.word, tiles: [] })),
        solved: roundPoints(player) > 0,
        solveMs: null,
        hints: 0,
      })),
    };
  },
};

function roundPoints(player: { found: { points: number }[] }) {
  return player.found.reduce((total, entry) => total + entry.points, 0);
}

export function serializeAnagram(room: Room, viewerId: string): AnagramState | null {
  const state = room.anagram;
  if (!state) return null;

  const done = room.phase !== 'playing';
  const viewer = room.players.get(viewerId);
  const counts: Record<string, number> = {};

  for (const player of room.players.values()) {
    counts[player.profile.id] = player.found.length;
  }

  return {
    pool: state.pool,
    found: viewer ? viewer.found : null,
    counts,
    best: done ? state.best : 0,
  };
}
