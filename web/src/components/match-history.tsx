import type { MatchRecord } from '@/lib/db';
import { gameMeta } from '@/components/games/registry';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

function when(value: string) {
  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);

  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return date.toLocaleDateString();
}

export function MatchHistory({
  matches,
  userId,
  empty = 'No games yet.',
}: {
  matches: MatchRecord[];
  userId: string;
  empty?: string;
}) {
  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">{empty}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {matches.map((match) => {
        const me = match.players.find((player) => player.userId === userId);
        const others = match.players.filter((player) => player.userId !== userId);
        const won = match.winnerId === userId;
        const drew = match.winnerId === null;

        return (
          <Card key={match.matchId} className="transition-colors hover:border-primary/50">
            <CardContent className="flex items-center justify-between gap-4 p-0">
              <Link
                href={`/history/${match.matchId}`}
                className="flex flex-1 items-center justify-between gap-4 p-4"
              >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  vs {others.map((player) => player.name).join(', ') || 'nobody'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {gameMeta(match.game ?? 'wordbattle').name} · {match.rounds.length} rounds ·{' '}
                  {when(match.playedAt)}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono text-sm tabular-nums">
                  {me?.score ?? 0}
                  <span className="text-muted-foreground">
                    {' '}
                    - {Math.max(0, ...others.map((player) => player.score))}
                  </span>
                </span>
                <span
                  className={
                    drew
                      ? 'text-xs font-semibold uppercase text-muted-foreground'
                      : won
                        ? 'text-xs font-semibold uppercase text-emerald-500'
                        : 'text-xs font-semibold uppercase text-red-500'
                  }
                >
                  {drew ? 'draw' : won ? 'win' : 'loss'}
                </span>
              </div>
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
