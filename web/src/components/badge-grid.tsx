import { Award, Lock } from 'lucide-react';
import type { AchievementView } from '@/lib/achievements';
import { cn } from '@/lib/utils';

const TIER: Record<string, string> = {
  bronze: 'text-amber-700 bg-amber-700/10 ring-amber-700/30',
  silver: 'text-slate-400 bg-slate-400/10 ring-slate-400/30',
  gold: 'text-yellow-500 bg-yellow-500/10 ring-yellow-500/30',
};

export function BadgeGrid({ badges }: { badges: AchievementView[] }) {
  const earned = badges.filter((badge) => badge.earned).length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {earned} of {badges.length} unlocked
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={cn(
              'rounded-xl border border-border bg-card p-4 transition-opacity',
              badge.earned ? '' : 'opacity-60',
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1',
                  badge.earned ? TIER[badge.tier] : 'bg-muted text-muted-foreground ring-border',
                )}
              >
                {badge.earned ? <Award className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{badge.name}</p>
                <p className="text-xs text-muted-foreground">{badge.description}</p>

                {!badge.earned && (
                  <div className="mt-2">
                    <div className="h-1.5 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full rounded bg-primary/70"
                        style={{ width: `${Math.min(100, (badge.current / badge.target) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                      {badge.current} / {badge.target}
                    </p>
                  </div>
                )}

                {badge.earned && badge.at && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    earned {new Date(badge.at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BadgeRow({ badges }: { badges: AchievementView[] }) {
  const earned = badges.filter((badge) => badge.earned);

  if (earned.length === 0) {
    return <p className="text-sm text-muted-foreground">No badges yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {earned.map((badge) => (
        <span
          key={badge.id}
          title={badge.description}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1',
            TIER[badge.tier],
          )}
        >
          <Award className="h-3.5 w-3.5" />
          {badge.name}
        </span>
      ))}
    </div>
  );
}
