'use client';

import { WORD_LENGTH, type MaskedGuess, type OwnGuess, type Tile } from '@/lib/protocol';
import { cn } from '@/lib/utils';

const TILE_STYLE: Record<Tile, string> = {
  correct: 'border-emerald-500 bg-emerald-500 text-white',
  present: 'border-amber-500 bg-amber-500 text-white',
  absent: 'border-transparent bg-muted text-muted-foreground',
};

export function Board({
  guesses,
  draft,
  rows,
}: {
  guesses: OwnGuess[];
  draft: string;
  rows: number;
}) {
  const filled = guesses.length;

  return (
    <div className="grid gap-1.5">
      {Array.from({ length: rows }).map((_, row) => {
        const guess = guesses[row];
        const isDraft = row === filled;

        return (
          <div key={row} className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: WORD_LENGTH }).map((_, col) => {
              const letter = guess ? guess.word[col] : isDraft ? (draft[col] ?? '') : '';
              const tile = guess?.tiles[col];

              return (
                <div
                  key={col}
                  className={cn(
                    'flex aspect-square items-center justify-center rounded-md border-2 text-2xl font-semibold uppercase',
                    tile ? TILE_STYLE[tile] : 'border-border',
                    !tile && letter ? 'border-muted-foreground/60' : '',
                  )}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function MiniBoard({ guesses, rows }: { guesses: MaskedGuess[]; rows: number }) {
  return (
    <div className="grid gap-1">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="grid grid-cols-5 gap-1">
          {Array.from({ length: WORD_LENGTH }).map((_, col) => {
            const tile = guesses[row]?.tiles[col];

            return (
              <div
                key={col}
                className={cn(
                  'h-3 w-3 rounded-[3px]',
                  tile === 'correct'
                    ? 'bg-emerald-500'
                    : tile === 'present'
                      ? 'bg-amber-500'
                      : tile === 'absent'
                        ? 'bg-muted-foreground/50'
                        : 'bg-muted',
                )}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
