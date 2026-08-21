'use client';

import { CPU_ID } from '@/lib/protocol';
import { cn } from '@/lib/utils';

export function TicTacToeBoard({
  board,
  marks,
  winningLine,
  lastMove,
  disabled,
  onPlay,
}: {
  board: (string | null)[];
  marks: Record<string, 'X' | 'O'>;
  winningLine: number[] | null;
  lastMove: number | null;
  disabled: boolean;
  onPlay: (index: number) => void;
}) {
  return (
    <div className="mx-auto grid w-full max-w-[300px] grid-cols-3 gap-2">
      {board.map((owner, index) => {
        const mark = owner ? marks[owner] : null;
        const winning = winningLine?.includes(index) ?? false;

        return (
          <button
            key={index}
            type="button"
            disabled={disabled || owner !== null}
            onClick={() => onPlay(index)}
            className={cn(
              'flex aspect-square items-center justify-center rounded-xl border-2 text-4xl font-bold transition-all',
              winning
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600'
                : 'border-border bg-card',
              !owner && !disabled && 'hover:border-primary/60 hover:bg-accent active:scale-95',
              lastMove === index && !winning && 'border-primary/60 tile-pop',
              mark === 'X' ? 'text-primary' : '',
            )}
          >
            {mark ?? ''}
          </button>
        );
      })}
    </div>
  );
}

export function markLabel(marks: Record<string, 'X' | 'O'>, playerId: string) {
  return marks[playerId] ?? '?';
}

export function isCpu(playerId: string | null) {
  return playerId === CPU_ID;
}
