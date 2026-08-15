import { WORD_LENGTH, type Tile } from './protocol.js';

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
