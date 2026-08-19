import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
  EMPTY_SOLO,
  EMPTY_STATS,
  friendState,
  profileSeries,
  publicProfile,
  requestFriend,
  respondToRequest,
} from '@/lib/db';
import { GAME_LIST } from '@/components/games/registry';
import { Avatar } from '@/components/avatar';
import { Bars, FormRow } from '@/components/charts/bars';
import { Donut } from '@/components/charts/donut';
import { MobileNav } from '@/components/mobile-nav';
import { SiteHeader } from '@/components/site-header';
import { StatTile } from '@/components/stat-tile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default async function PublicProfile({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const viewerId = session.user.id;
  const { id } = await params;
  if (id === viewerId) redirect('/profile');

  const profile = await publicProfile(id);
  if (!profile) notFound();

  const [series, relation] = await Promise.all([
    profileSeries(id, 20),
    friendState(viewerId, id),
  ]);

  const stats = { ...EMPTY_STATS, ...profile.stats };
  const solo = { ...EMPTY_SOLO, ...profile.solo };
  const winRate = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;

  async function add() {
    'use server';

    const current = await auth();
    if (!current?.user?.id) redirect('/signin');

    await requestFriend(current.user.id, id);
    revalidatePath(`/u/${id}`);
  }

  async function accept() {
    'use server';

    const current = await auth();
    if (!current?.user?.id) redirect('/signin');

    await respondToRequest(current.user.id, id, true);
    revalidatePath(`/u/${id}`);
  }

  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <SiteHeader />

      <main className="container max-w-3xl py-8 sm:py-10">
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <Avatar id={profile.avatar} name={profile.displayName} size={64} />

          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{profile.displayName}</h1>
            <p className="text-sm text-muted-foreground">
              {stats.points} points · {stats.played} matches
            </p>
          </div>

          {relation === 'friends' && (
            <span className="text-sm text-muted-foreground">friends</span>
          )}
          {relation === 'sent' && <span className="text-sm text-muted-foreground">requested</span>}
          {relation === 'incoming' && (
            <form action={accept}>
              <Button type="submit">Accept request</Button>
            </form>
          )}
          {relation === 'none' && (
            <form action={add}>
              <Button type="submit" variant="outline">
                Add friend
              </Button>
            </form>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Matches" value={String(stats.played)} />
          <StatTile label="Wins" value={String(stats.won)} />
          <StatTile label="Win rate" value={`${winRate}%`} />
          <StatTile label="Best streak" value={String(stats.bestStreak)} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Donut
            label="Results"
            center={`${winRate}%`}
            segments={[
              { name: 'won', value: series.wins, className: 'stroke-emerald-500' },
              { name: 'lost', value: series.losses, className: 'stroke-red-500' },
              { name: 'drawn', value: series.draws, className: 'stroke-muted-foreground' },
            ]}
          />
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recent form
            </p>
            <div className="mt-3">
              {series.form.length > 0 ? (
                <FormRow results={series.form} />
              ) : (
                <p className="text-sm text-muted-foreground">No matches yet.</p>
              )}
            </div>
          </div>
          <Bars
            label="Guesses needed to solve"
            data={series.guessSpread}
            empty="Nothing solved yet."
          />
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                By game
              </p>
              {GAME_LIST.map((game) => {
                const tally = profile.games?.[game.id] ?? { played: 0, won: 0 };

                return (
                  <div key={game.id} className="flex items-center justify-between text-sm">
                    <span>{game.name}</span>
                    <span className="text-muted-foreground">
                      {tally.won}/{tally.played}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between text-sm">
                <span>Solo words</span>
                <span className="text-muted-foreground">{solo.solves}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
