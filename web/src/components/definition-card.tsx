'use client';

import { useEffect, useState } from 'react';
import type { Definition } from '@/lib/vocab';
import { Skeleton } from '@/components/ui/skeleton';

export function DefinitionCard({ word }: { word: string }) {
  const [definition, setDefinition] = useState<Definition | null>(null);
  const [state, setState] = useState<'loading' | 'done' | 'missing'>('loading');

  useEffect(() => {
    let live = true;
    setState('loading');

    fetch(`/api/define?word=${encodeURIComponent(word)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body: Definition | null) => {
        if (!live) return;

        if (!body) {
          setState('missing');
          return;
        }

        setDefinition(body);
        setState('done');
      })
      .catch(() => live && setState('missing'));

    return () => {
      live = false;
    };
  }, [word]);

  if (state === 'loading') {
    return (
      <div className="space-y-2 rounded-lg border border-border p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  if (state === 'missing' || !definition) {
    return (
      <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
        No definition found for {word}.
      </div>
    );
  }

  return (
    <div className="fade-in space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-baseline gap-2">
        <p className="text-base font-semibold uppercase tracking-wide">{definition.word}</p>
        {definition.phonetic && (
          <span className="text-xs text-muted-foreground">{definition.phonetic}</span>
        )}
      </div>

      <div className="space-y-2">
        {definition.meanings.map((meaning, index) => (
          <div key={index}>
            <p className="text-sm">
              {meaning.partOfSpeech && (
                <span className="mr-1.5 text-xs italic text-muted-foreground">
                  {meaning.partOfSpeech}
                </span>
              )}
              {meaning.definition}
            </p>
            {meaning.example && (
              <p className="mt-0.5 text-xs text-muted-foreground">“{meaning.example}”</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
