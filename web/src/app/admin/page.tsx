import { redirect } from 'next/navigation';
import { adminConfigured, codeMatches, isAdmin, signIn, signOut } from '@/lib/admin';
import { adminOverview } from '@/lib/db';
import { AdminNav } from '@/components/admin/admin-nav';
import { DayChart } from '@/components/admin/day-chart';
import { Gate } from '@/components/admin/gate';
import { StatTile } from '@/components/stat-tile';
import { Card, CardContent } from '@/components/ui/card';

const serverUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'http://localhost:4000';

async function serverHealth() {
  try {
    const res = await fetch(`${serverUrl}/health`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as { uptime: number; rooms: number; queue: number };
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

      <main className="container space-y-8 py-8">
        {!overview ? (
          <p className="text-sm text-red-500">Database unreachable.</p>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatTile label="Users" value={String(overview.users)} />
              <StatTile label="New (14d)" value={String(overview.newUsers)} />
              <StatTile label="Matches" value={String(overview.matches)} />
              <StatTile label="Solo games" value={String(overview.soloGames)} />
              <StatTile label="Rounds (14d)" value={String(overview.rounds)} />
              <StatTile
                label="Live rooms"
                value={health ? String(health.rooms) : '-'}
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <DayChart data={overview.perDay} />

              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Game server
                    </p>
                    {health ? (
                      <div className="mt-2 space-y-1 text-sm">
                        <p>up {Math.round(health.uptime / 60)} min</p>
                        <p className="text-muted-foreground">{health.rooms} rooms open</p>
                        <p className="text-muted-foreground">{health.queue} in queue</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-red-500">unreachable</p>
                    )}
                  </CardContent>
                </Card>

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
                        <div
                          key={player.userId}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="truncate">
                            {index + 1}. {player.displayName}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {player.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
