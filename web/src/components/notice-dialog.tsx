'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Notice {
  _id: string;
  kind: 'warn' | 'ban';
  reason: string;
  until: string | null;
}

export function NoticeDialog({
  notices,
  acknowledgeAction,
}: {
  notices: Notice[];
  acknowledgeAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(notices.length > 0);

  if (!open || notices.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="pop-in w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </span>
          <p className="font-semibold tracking-tight">
            {notices.length > 1 ? `${notices.length} notices` : 'A notice from the mods'}
          </p>
        </div>

        <div className="space-y-2">
          {notices.map((notice) => (
            <div key={notice._id} className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium">
                {notice.kind === 'ban' ? 'Account banned' : 'Warning'}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {notice.reason || 'No reason given.'}
              </p>
              {notice.until && (
                <p className="mt-1 text-xs text-muted-foreground">
                  until {new Date(notice.until).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>

        <form action={acknowledgeAction}>
          <Button type="submit" className="w-full" onClick={() => setOpen(false)}>
            Got it
          </Button>
        </form>
      </div>
    </div>
  );
}
