import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { gameLeaderboard, leaderboard, type GameKey } from '@/lib/db';
import { GAME_LIST } from '@/components/games/registry';
import { Avatar } from '@/components/avatar';
import { MobileNav } from '@/components/mobile-nav';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const TABS = [{ id: 'points', name: 'Points' }, ...GAME_LIST.map((game) => ({ id: game.id, name: game.name }))];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const requested = (await searchParams).tab ?? 'points';
  const tab = TABS.some((entry) => entry.id === requested) ? requested : 'points';

  const rows =
    tab === 'points'
      ? (await leaderboard(20)).map((player) => ({
          userId: player.userId,
          displayName: player.displayName || 'player',
          avatar: player.avatar || 'ember',
          primary: `${player.stats.points}`,
          secondary: `${player.stats.won}/${player.stats.played}`,
        }))
      : (await gameLeaderboard(tab as GameKey, 20)).map((player) => ({
          userId: player.userId,
          displayName: player.displayName,
          avatar: player.avatar,
          primary: `${player.won}`,
          secondary: `${player.played} played`,
        }));

  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <SiteHeader />

      <main className="container max-w-2xl py-8 sm:py-10">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Leaderboard</h1>

        <div className="mb-5 flex flex-wrap gap-2">
          {TABS.map((entry) => (
            <Button
              key={entry.id}
              asChild
              size="sm"
              variant={tab === entry.id ? 'default' : 'outline'}
            >
              <Link href={`/leaderboard?tab=${entry.id}`}>{entry.name}</Link>
            </Button>
          ))}
        </div>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nobody has finished a match here yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {rows.map((player, index) => (
              <Card
                key={player.userId}
                className={player.userId === session.user.id ? 'border-primary' : undefined}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="w-6 text-sm font-semibold tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <Avatar id={player.avatar} name={player.displayName} size={32} />
                  <Link
                    href={player.userId === session.user.id ? '/profile' : `/u/${player.userId}`}
                    className="flex-1 truncate text-sm font-medium hover:underline"
                  >
                    {player.displayName}
                  </Link>
                  <span className="text-xs text-muted-foreground">{player.secondary}</span>
                  <span className="font-mono text-sm tabular-nums">{player.primary}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
