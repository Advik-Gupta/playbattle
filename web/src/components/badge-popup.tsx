'use client';

import { useState } from 'react';
import { Award } from 'lucide-react';
import type { AchievementView } from '@/lib/achievements';
import { Button } from '@/components/ui/button';

export function BadgePopup({
  badges,
  acknowledgeAction,
}: {
  badges: AchievementView[];
  acknowledgeAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(badges.length > 0);

  if (!open || badges.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="pop-in w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-5 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/15">
          <Award className="h-6 w-6 text-yellow-500" />
        </span>

        <div>
          <p className="text-lg font-semibold tracking-tight">
            {badges.length > 1 ? `${badges.length} new badges` : 'New badge'}
          </p>

          <div className="mt-3 space-y-2">
            {badges.map((badge) => (
              <div key={badge.id} className="rounded-lg border border-border p-3 text-left">
                <p className="text-sm font-medium">{badge.name}</p>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>

        <form action={acknowledgeAction}>
          <Button type="submit" className="w-full" onClick={() => setOpen(false)}>
            Nice
          </Button>
        </form>
      </div>
    </div>
  );
}
