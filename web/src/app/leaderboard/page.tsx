import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { leaderboard } from '@/lib/db';
import { SiteHeader } from '@/components/site-header';
import { Card, CardContent } from '@/components/ui/card';

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const players = await leaderboard(20);

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main className="container max-w-2xl py-10">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Leaderboard</h1>

        {players.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nobody has finished a match yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {players.map((player, index) => (
              <Card
                key={player.userId}
                className={player.userId === session.user.id ? 'border-primary' : undefined}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <span className="w-6 text-sm font-semibold tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">
                    {player.displayName || 'player'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {player.stats.won}/{player.stats.played}
                  </span>
                  <span className="font-mono text-sm tabular-nums">{player.stats.points}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
