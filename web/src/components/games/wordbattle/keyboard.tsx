'use client';

import { useEffect } from 'react';
import type { Tile } from '@/lib/protocol';
import { cn } from '@/lib/utils';

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

const KEY_STYLE: Record<Tile, string> = {
  correct: 'bg-emerald-500 text-white',
  present: 'bg-amber-500 text-white',
  absent: 'bg-muted text-muted-foreground/60',
};

export function Keyboard({
  keyboard,
  onKey,
  onEnter,
  onBackspace,
  disabled,
}: {
  keyboard: Record<string, Tile>;
  onKey: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  disabled: boolean;
}) {
  useEffect(() => {
    if (disabled) return;

    function handle(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (event.key === 'Enter') onEnter();
      else if (event.key === 'Backspace') onBackspace();
      else if (/^[a-zA-Z]$/.test(event.key)) onKey(event.key.toLowerCase());
    }

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [disabled, onKey, onEnter, onBackspace]);

  return (
    <div className="grid gap-1.5">
      {ROWS.map((row, index) => (
        <div key={row} className="flex justify-center gap-1 sm:gap-1.5">
          {index === 2 && (
            <button
              type="button"
              onClick={onEnter}
              disabled={disabled}
              className="h-12 shrink-0 rounded-md bg-accent px-2 text-[11px] font-semibold uppercase disabled:opacity-50 sm:px-3 sm:text-xs"
            >
              Enter
            </button>
          )}

          {row.split('').map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => onKey(letter)}
              disabled={disabled}
              className={cn(
                'h-12 min-w-0 flex-1 rounded-md text-sm font-semibold uppercase transition-colors active:scale-95 disabled:opacity-50',
                keyboard[letter] ? KEY_STYLE[keyboard[letter]] : 'bg-accent',
              )}
            >
              {letter}
            </button>
          ))}

          {index === 2 && (
            <button
              type="button"
              onClick={onBackspace}
              disabled={disabled}
              className="h-12 shrink-0 rounded-md bg-accent px-2 text-[11px] font-semibold uppercase disabled:opacity-50 sm:px-3 sm:text-xs"
            >
              Del
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
