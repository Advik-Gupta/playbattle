'use client';

import { useEffect, useRef } from 'react';
import { useSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';

export function Toaster() {
  const toasts = useSocket((s) => s.toasts);
  const dismiss = useSocket((s) => s.dismiss);

  const seen = useRef(new Set<number>());

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const toast of toasts) {
      if (seen.current.has(toast.id)) continue;

      seen.current.add(toast.id);
      timers.push(setTimeout(() => dismiss(toast.id), 4000));
    }

    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          onClick={() => dismiss(toast.id)}
          className={cn(
            'slide-up pointer-events-auto rounded-lg border px-3.5 py-2.5 text-sm shadow-md',
            toast.kind === 'error'
              ? 'border-red-500/30 bg-red-500/10 text-red-500'
              : toast.kind === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                : 'border-border bg-card text-foreground',
          )}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
