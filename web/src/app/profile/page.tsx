import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
  EMPTY_DAILY,
  EMPTY_SOLO,
  EMPTY_STATS,
  displayNameTaken,
  getProfile,
  profileSeries,
  recentMatches,
  saveProfile,
} from '@/lib/db';
import { DEFAULT_AVATAR, isAvatarId } from '@/lib/avatars';
import { GAME_LIST } from '@/components/games/registry';
import { Avatar } from '@/components/avatar';
import { AvatarPicker } from '@/components/avatar-picker';
import { NotifyToggle } from '@/components/notify-prompt';
import { Bars, FormRow } from '@/components/charts/bars';
import { Donut } from '@/components/charts/donut';
import { Sparkline } from '@/components/charts/sparkline';
import { MatchHistory } from '@/components/match-history';
import { MobileNav } from '@/components/mobile-nav';
import { SiteHeader } from '@/components/site-header';
import { StatTile } from '@/components/stat-tile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const ERRORS: Record<string, string> = {
  short: 'Names need at least two characters.',
  taken: 'Someone already has that name.',
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const userId = session.user.id;
  const params = await searchParams;

  const [profile, matches, series] = await Promise.all([
    getProfile(userId),
    recentMatches(userId, 5),
    profileSeries(userId, 20),
  ]);

  const stats = profile?.stats ?? EMPTY_STATS;
  const solo = profile?.solo ?? EMPTY_SOLO;
  const daily = profile?.daily ?? EMPTY_DAILY;
  const winRate = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  const avgGuesses = stats.solves > 0 ? (stats.guesses / stats.solves).toFixed(1) : '-';

  async function save(formData: FormData) {
    'use server';

    const current = await auth();
    if (!current?.user?.id) redirect('/signin');

    const displayName = String(formData.get('displayName') ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 20);
    const avatar = String(formData.get('avatar') ?? '');

    if (displayName.length < 2) redirect('/profile?error=short');
    if (await displayNameTaken(displayName, current.user.id)) redirect('/profile?error=taken');

    await saveProfile(current.user.id, {
      displayName,
      avatar: isAvatarId(avatar) ? avatar : DEFAULT_AVATAR,
    });

    revalidatePath('/profile');
    redirect('/profile?saved=1');
  }

  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <SiteHeader />

      <main className="container max-w-3xl py-8 sm:py-10">
        <div className="mb-8 flex items-center gap-4">
          <Avatar id={profile?.avatar} name={profile?.displayName} size={64} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {profile?.displayName ?? 'player'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {stats.points} points · {stats.played} matches
            </p>
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

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Sparkline points={series.points} label="Points over recent matches" />
          <Donut
            label="Results"
            center={`${winRate}%`}
            segments={[
              { name: 'won', value: series.wins, className: 'stroke-emerald-500' },
              { name: 'lost', value: series.losses, className: 'stroke-red-500' },
              { name: 'drawn', value: series.draws, className: 'stroke-muted-foreground' },
            ]}
          />
          <Bars
            label="Guesses needed to solve"
            data={series.guessSpread}
            empty="Solve a word to see the spread."
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
        </div>

        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">By game</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {GAME_LIST.map((game) => {
              const tally = profile?.games?.[game.id] ?? { played: 0, won: 0 };
              const rate = tally.played > 0 ? Math.round((tally.won / tally.played) * 100) : 0;
              const Icon = game.icon;

              return (
                <Card key={game.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{game.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tally.played} played · {tally.won} won · {rate}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Daily</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Played" value={String(daily.played)} />
            <StatTile label="Solved" value={String(daily.solves)} />
            <StatTile label="Streak" value={String(daily.streak)} />
            <StatTile label="Best" value={String(daily.bestStreak)} />
          </div>
        </div>

        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Solo</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Played" value={String(solo.played)} />
            <StatTile label="Solved" value={String(solo.solves)} />
            <StatTile label="Streak" value={String(solo.streak)} />
            <StatTile label="Best" value={String(solo.bestStreak)} />
          </div>
        </div>

        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Appearance</h2>
          <Card>
            <CardContent className="space-y-4 p-6">
              <form action={save} className="space-y-4">
                <Input
                  name="displayName"
                  defaultValue={profile?.displayName ?? ''}
                  maxLength={20}
                  placeholder="your name"
                  required
                />
                <AvatarPicker name="avatar" defaultValue={profile?.avatar ?? DEFAULT_AVATAR} />

                {params.error && (
                  <p className="text-sm text-red-500">{ERRORS[params.error] ?? 'Try again.'}</p>
                )}
                {params.saved === '1' && <p className="text-sm text-emerald-500">Saved.</p>}

                <Button type="submit">Save</Button>
              </form>

              <div className="border-t border-border pt-4">
                <p className="mb-2 text-sm font-medium">Notifications</p>
                <NotifyToggle />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Recent games</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/history">See all</Link>
            </Button>
          </div>
          <MatchHistory matches={matches} userId={userId} />
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
