import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { EMPTY_STATS, getProfile, recentMatches } from '@/lib/db';
import { MatchHistory } from '@/components/match-history';
import { SiteHeader } from '@/components/site-header';
import { StatTile } from '@/components/stat-tile';
import { Button } from '@/components/ui/button';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const [profile, matches] = await Promise.all([
    getProfile(session.user.id),
    recentMatches(session.user.id, 5),
  ]);

  const stats = profile?.stats ?? EMPTY_STATS;
  const winRate = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  const avgGuesses = stats.solves > 0 ? (stats.guesses / stats.solves).toFixed(1) : '-';

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main className="container max-w-3xl py-10">
        <div className="mb-8 flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-semibold uppercase text-primary-foreground">
            {(profile?.displayName ?? 'p').slice(0, 1)}
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {profile?.displayName ?? 'player'}
            </h1>
            <p className="text-sm text-muted-foreground">{stats.points} points</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Matches" value={String(stats.played)} />
          <StatTile label="Wins" value={String(stats.won)} />
          <StatTile label="Win rate" value={`${winRate}%`} />
          <StatTile label="Streak" value={String(stats.streak)} />
          <StatTile label="Rounds won" value={String(stats.roundsWon)} />
          <StatTile label="Words solved" value={String(stats.solves)} />
          <StatTile label="Avg guesses" value={avgGuesses} />
          <StatTile label="Best streak" value={String(stats.bestStreak)} />
        </div>

        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Recent games</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/history">See all</Link>
            </Button>
          </div>
          <MatchHistory matches={matches} userId={session.user.id} />
        </div>
      </main>
    </div>
  );
}
