'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { permission, readChoice, request, supported, writeChoice } from '@/lib/notify';
import { Button } from '@/components/ui/button';

export function NotifyPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!supported()) return;
    if (readChoice() !== 'unset') return;
    if (permission() === 'denied') return;

    const id = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(id);
  }, []);

  if (!visible) return null;

  async function allow() {
    const granted = await request();
    writeChoice(granted ? 'on' : 'off');
    setVisible(false);
  }

  function decline() {
    writeChoice('off');
    setVisible(false);
  }

  return (
    <div className="slide-up safe-bottom fixed bottom-20 left-1/2 z-40 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-border bg-card p-4 shadow-lg sm:bottom-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Bell className="h-4 w-4 text-primary" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Get pinged for invites</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Only when the tab is in the background. Nothing else.
          </p>

          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={allow}>
              Allow
            </Button>
            <Button size="sm" variant="ghost" onClick={decline}>
              No thanks
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotifyToggle() {
  const [choice, setChoice] = useState<'on' | 'off'>('off');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setChoice(readChoice() === 'on' ? 'on' : 'off');
    setReady(true);
  }, []);

  if (!ready || !supported()) return null;

  async function toggle() {
    if (choice === 'on') {
      writeChoice('off');
      setChoice('off');
      return;
    }

    const granted = await request();
    writeChoice(granted ? 'on' : 'off');
    setChoice(granted ? 'on' : 'off');
  }

  return (
    <Button size="sm" variant="outline" onClick={toggle}>
      {choice === 'on' ? 'Notifications on' : 'Turn notifications on'}
    </Button>
  );
}
