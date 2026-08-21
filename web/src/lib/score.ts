export type Tile = 'correct' | 'present' | 'absent';

export function scoreLocal(guess: string, answer: string): Tile[] {
  const length = guess.length;
  const tiles: Tile[] = new Array(length).fill('absent');

  if (!answer || answer.length !== length) return tiles;

  const remaining: Record<string, number> = {};

  for (let i = 0; i < length; i += 1) {
    if (guess[i] === answer[i]) {
      tiles[i] = 'correct';
    } else {
      remaining[answer[i]] = (remaining[answer[i]] ?? 0) + 1;
    }
  }

  for (let i = 0; i < length; i += 1) {
    if (tiles[i] === 'correct') continue;

    const letter = guess[i];
    if ((remaining[letter] ?? 0) > 0) {
      tiles[i] = 'present';
      remaining[letter] -= 1;
    }
  }

  return tiles;
}
