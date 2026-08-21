import { redirect } from 'next/navigation';
import { adminConfigured, codeMatches, isAdmin, signIn, signOut } from '@/lib/admin';
import { adminOverview } from '@/lib/db';
import { AdminNav } from '@/components/admin/admin-nav';
import { DayChart, LineChart } from '@/components/admin/day-chart';
import { Gate } from '@/components/admin/gate';
import { StatTile } from '@/components/stat-tile';
import { Card, CardContent } from '@/components/ui/card';

const serverUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'http://localhost:4000';

export const dynamic = 'force-dynamic';

async function serverHealth() {
  try {
    const res = await fetch(`${serverUrl}/health`, { cache: 'no-store' });
    if (!res.ok) return null;

    return (await res.json()) as {
      uptime: number;
      rooms: number;
      queue: number;
      banned: number;
      buckets: number;
    };
  } catch {
    return null;
  }
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const unlocked = await isAdmin();

  async function unlock(formData: FormData) {
    'use server';

    if (!codeMatches(String(formData.get('code') ?? ''))) redirect('/admin?error=1');

    await signIn();
    redirect('/admin');
  }

  async function lock() {
    'use server';
    await signOut();
    redirect('/admin');
  }

  if (!unlocked) {
    const error = (await searchParams).error === '1';
    return <Gate action={unlock} error={error} configured={adminConfigured} />;
  }

  const [overview, health] = await Promise.all([adminOverview(14), serverHealth()]);

  return (
    <>
      <AdminNav signOutAction={lock} />

      <main className="container space-y-6 py-8">
        {!overview ? (
          <p className="text-sm text-red-500">Database unreachable.</p>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              <StatTile label="Users" value={String(overview.users)} />
              <StatTile label="New (14d)" value={String(overview.newUsers)} />
              <StatTile label="Active (14d)" value={String(overview.activePlayers)} />
              <StatTile label="Came back" value={String(overview.returning)} />
              <StatTile label="Matches" value={String(overview.matches)} />
              <StatTile label="Solo games" value={String(overview.soloGames)} />
            </section>

            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              <StatTile label="Rounds (14d)" value={String(overview.rounds)} />
              <StatTile label="Avg rounds" value={String(overview.avgRounds)} />
              <StatTile label="Solve rate" value={`${overview.solveRate}%`} />
              <StatTile label="Sanctions" value={String(overview.liveSanctions)} />
              <StatTile label="Live rooms" value={health ? String(health.rooms) : '-'} />
              <StatTile label="In queue" value={health ? String(health.queue) : '-'} />
            </section>

            <section className="grid gap-3 lg:grid-cols-2">
              <DayChart data={overview.perDay} />

              <div className="grid gap-3 sm:grid-cols-2">
                <LineChart
                  data={overview.perDay}
                  label="Players per day"
                  pick={(point) => point.players}
                />
                <LineChart
                  data={overview.perDay}
                  label="Signups per day"
                  pick={(point) => point.signups}
                />
              </div>
            </section>

            <section className="grid gap-3 lg:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Top players
                  </p>

                  <div className="mt-3 space-y-2">
                    {overview.top.length === 0 && (
                      <p className="text-sm text-muted-foreground">nobody yet</p>
                    )}

                    {overview.top.map((player, index) => (
                      <div key={player.userId} className="flex items-center justify-between text-sm">
                        <span className="truncate">
                          {index + 1}. {player.displayName}
                        </span>
                        <span className="tabular-nums text-muted-foreground">{player.points}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Hardest words
                  </p>

                  <div className="mt-3 space-y-2">
                    {overview.hardest.length === 0 && (
                      <p className="text-sm text-muted-foreground">not enough plays yet</p>
                    )}

                    {overview.hardest.map((word) => (
                      <div key={word.word} className="flex items-center justify-between text-sm">
                        <span className="font-mono uppercase">{word.word}</span>
                        <span className="text-xs text-muted-foreground">
                          {word.rate}% of {word.seen}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Game server
                  </p>

                  {health ? (
                    <div className="mt-3 space-y-1 text-sm">
                      <p>up {Math.round(health.uptime / 60)} min</p>
                      <p className="text-muted-foreground">{health.rooms} rooms open</p>
                      <p className="text-muted-foreground">{health.queue} waiting to match</p>
                      <p className="text-muted-foreground">{health.banned} bans loaded</p>
                      <p className="text-muted-foreground">{health.buckets} rate buckets</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-red-500">unreachable</p>
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
    </>
  );
}
