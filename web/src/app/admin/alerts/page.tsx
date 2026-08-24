import { redirect } from 'next/navigation';
import { isAdmin, signOut } from '@/lib/admin';
import { adminOverview, sanctionPage, adminUserPage } from '@/lib/db';
import { liveRooms } from '@/lib/game-server';
import { AdminNav } from '@/components/admin/admin-nav';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

interface Alert {
  level: 'warn' | 'info';
  title: string;
  detail: string;
}

export default async function AdminAlerts() {
  if (!(await isAdmin())) redirect('/admin');

  const [overview, rooms, sanctions, users] = await Promise.all([
    adminOverview(14),
    liveRooms(),
    sanctionPage(1, 50),
    adminUserPage('', 1, 100),
  ]);

  async function lock() {
    'use server';
    await signOut();
    redirect('/admin');
  }

  const alerts: Alert[] = [];

  if (rooms === null) {
    alerts.push({
      level: 'warn',
      title: 'Game server unreachable',
      detail: 'The web app cannot reach the socket server, so nobody can play.',
    });
  }

  if (!overview) {
    alerts.push({
      level: 'warn',
      title: 'Database unreachable',
      detail: 'Stats, profiles and history are all paused.',
    });
  }

  const stale = (rooms ?? []).filter(
    (room) => room.players.length > 0 && room.players.every((player) => !player.connected),
  );

  if (stale.length > 0) {
    alerts.push({
      level: 'info',
      title: `${stale.length} rooms with nobody connected`,
      detail: `They close on their own, but you can force them: ${stale.map((room) => room.code).join(', ')}`,
    });
  }

  const banned = users.users.filter((user) => user.banned).length;
  if (banned > 0) {
    alerts.push({
      level: 'info',
      title: `${banned} banned accounts`,
      detail: 'Review them on the sanctions page if any were temporary.',
    });
  }

  const expiring = sanctions.sanctions.filter((sanction) => {
    if (sanction.liftedAt || !sanction.until) return false;

    const left = new Date(sanction.until).getTime() - Date.now();
    return left > 0 && left < 86_400_000;
  });

  if (expiring.length > 0) {
    alerts.push({
      level: 'info',
      title: `${expiring.length} sanctions expire within a day`,
      detail: expiring.map((sanction) => sanction.userId).join(', '),
    });
  }

  if (overview && overview.activePlayers === 0 && overview.users > 0) {
    alerts.push({
      level: 'info',
      title: 'Nobody has played in two weeks',
      detail: `${overview.users} accounts exist but none of them are active.`,
    });
  }

  return (
    <>
      <AdminNav signOutAction={lock} />

      <main className="container max-w-3xl py-8">
        <h1 className="mb-4 text-lg font-semibold tracking-tight">Alerts</h1>

        {alerts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Everything looks healthy.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <Card
                key={alert.title}
                className={alert.level === 'warn' ? 'border-red-500/40' : undefined}
              >
                <CardContent className="p-4">
                  <p
                    className={
                      alert.level === 'warn'
                        ? 'text-sm font-medium text-red-500'
                        : 'text-sm font-medium'
                    }
                  >
                    {alert.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{alert.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
