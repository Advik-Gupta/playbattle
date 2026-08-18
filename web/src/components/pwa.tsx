'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

const DISMISSED = 'playbattle-install-dismissed';

export function Pwa() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker?.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      caches?.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
      return;
    }

    navigator.serviceWorker?.register('/sw.js').catch(() => undefined);
  }, []);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISSED) === '1';
    } catch {
      dismissed = false;
    }

    if (dismissed) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  function dismiss() {
    setPrompt(null);
    try {
      window.localStorage.setItem(DISMISSED, '1');
    } catch {
      return;
    }
  }

  async function install() {
    if (!prompt) return;

    await prompt.prompt();
    await prompt.userChoice;
    dismiss();
  }

  if (!prompt) return null;

  return (
    <div className="pop-in safe-bottom fixed bottom-4 left-1/2 z-50 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-border bg-card p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Download className="h-4 w-4 text-primary" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Install playbattle</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add it to your home screen for full screen games.
          </p>

          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={install}>
              Install
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
