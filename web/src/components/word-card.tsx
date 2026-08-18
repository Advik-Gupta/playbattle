'use client';

import { useState } from 'react';
import type { VocabEntry } from '@/lib/vocab';
import { DefinitionCard } from '@/components/definition-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function WordCard({
  entry,
  statusAction,
  forgetAction,
}: {
  entry: VocabEntry;
  statusAction: (formData: FormData) => Promise<void>;
  forgetAction: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="text-left"
          >
            <p className="text-lg font-semibold uppercase tracking-[0.15em]">{entry.word}</p>
            <p className="text-xs text-muted-foreground">
              seen {entry.seen} · solved {entry.correct}
            </p>
          </button>

          <span
            className={
              entry.status === 'known'
                ? 'rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-emerald-600'
                : 'rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-600'
            }
          >
            {entry.status}
          </span>
        </div>

        {open && <DefinitionCard word={entry.word} />}

        <div className="flex gap-2">
          <form action={statusAction}>
            <input type="hidden" name="word" value={entry.word} />
            <input
              type="hidden"
              name="status"
              value={entry.status === 'known' ? 'learning' : 'known'}
            />
            <Button size="sm" variant="outline" type="submit">
              {entry.status === 'known' ? 'Still learning' : 'Mark known'}
            </Button>
          </form>

          <form action={forgetAction}>
            <input type="hidden" name="word" value={entry.word} />
            <Button size="sm" variant="ghost" type="submit">
              Remove
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
