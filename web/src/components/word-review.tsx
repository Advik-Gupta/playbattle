'use client';

import { useState } from 'react';
import type { VocabEntry } from '@/lib/vocab';
import { DefinitionCard } from '@/components/definition-card';
import { Button } from '@/components/ui/button';

const SEEN_KEY = 'playbattle-review-day';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function WordReview({
  word,
  markKnown,
}: {
  word: VocabEntry | null;
  markKnown: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(() => {
    if (!word) return false;

    try {
      return window.localStorage.getItem(SEEN_KEY) !== today();
    } catch {
      return true;
    }
  });

  function close() {
    setOpen(false);

    try {
      window.localStorage.setItem(SEEN_KEY, today());
    } catch {
      return;
    }
  }

  if (!open || !word) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="pop-in w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Word of the day
          </p>
          <p className="mt-1 text-2xl font-semibold uppercase tracking-[0.2em]">{word.word}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            seen {word.seen} times · solved {word.correct}
          </p>
        </div>

        <DefinitionCard word={word.word} />

        <div className="flex gap-2">
          <form action={markKnown} className="flex-1">
            <input type="hidden" name="word" value={word.word} />
            <Button type="submit" className="w-full" onClick={close}>
              I know this one
            </Button>
          </form>
          <Button variant="ghost" onClick={close}>
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
