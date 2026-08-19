import { WORD_LENGTH, type RoundSummary, type Tile } from '../protocol.js';
import type { Room } from '../rooms.js';
import { randomWord } from '../words.js';
import type { GameModule } from './types.js';

export function scoreGuess(guess: string, answer: string): Tile[] {
  const tiles: Tile[] = new Array(WORD_LENGTH).fill('absent');
  const remaining: Record<string, number> = {};

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (guess[i] === answer[i]) {
      tiles[i] = 'correct';
    } else {
      remaining[answer[i]] = (remaining[answer[i]] ?? 0) + 1;
    }
  }

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (tiles[i] === 'correct') continue;

    const letter = guess[i];
    if ((remaining[letter] ?? 0) > 0) {
      tiles[i] = 'present';
      remaining[letter] -= 1;
    }
  }

  return tiles;
}

const RANK: Record<Tile, number> = { absent: 0, present: 1, correct: 2 };

export function mergeKeyboard(
  keyboard: Record<string, Tile>,
  guess: string,
  tiles: Tile[],
): Record<string, Tile> {
  const next = { ...keyboard };

  for (let i = 0; i < guess.length; i += 1) {
    const letter = guess[i];
    const current = next[letter];
    if (!current || RANK[tiles[i]] > RANK[current]) next[letter] = tiles[i];
  }

  return next;
}

export function solved(tiles: Tile[]) {
  return tiles.every((tile) => tile === 'correct');
}

export function pointsFor(place: number, guessCount: number) {
  const base = place === 1 ? 100 : place === 2 ? 60 : place === 3 ? 40 : 25;
  return base + Math.max(0, 7 - guessCount) * 5;
}

export const wordbattle: GameModule = {
  id: 'wordbattle',

  startRound(room) {
    room.answer = randomWord(room.usedAnswers);
    room.usedAnswers.push(room.answer);
    room.ttt = null;
  },

  isRoundOver(room) {
    const active = [...room.players.values()].filter((player) => player.socketId !== null);
    if (active.length === 0) return true;

    return active.every(
      (player) =>
        player.solved || player.resigned || player.guesses.length >= room.config.maxGuesses,
    );
  },

  summarize(room): RoundSummary {
    const winner = [...room.players.values()]
      .filter((player) => player.solved)
      .sort((a, b) => (a.solveMs ?? 0) - (b.solveMs ?? 0))[0];

    return {
      round: room.round,
      answer: room.answer ?? '',
      winnerId: winner?.profile.id ?? null,
      draw: !winner,
      boards: [...room.players.values()].map((player) => ({
        playerId: player.profile.id,
        guesses: player.guesses,
        solved: player.solved,
        solveMs: player.solveMs,
        hints: player.hints.length,
      })),
    };
  },
};
