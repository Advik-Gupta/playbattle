import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isAdmin, signOut } from '@/lib/admin';
import { closeRoom, liveRooms } from '@/lib/game-server';
import { AdminNav } from '@/components/admin/admin-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AdminRooms() {
  if (!(await isAdmin())) redirect('/admin');

  const rooms = await liveRooms();

  async function lock() {
    'use server';
    await signOut();
    redirect('/admin');
  }

  async function close(formData: FormData) {
    'use server';

    if (!(await isAdmin())) redirect('/admin');

    const code = String(formData.get('code') ?? '');
    if (code) await closeRoom(code);

    revalidatePath('/admin/rooms');
  }

  return (
    <>
      <AdminNav signOutAction={lock} />

      <main className="container max-w-3xl py-8">
        <h1 className="mb-4 text-lg font-semibold tracking-tight">Live rooms</h1>

        {rooms === null && <p className="text-sm text-red-500">Game server unreachable.</p>}

        {rooms?.length === 0 && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nothing running right now.
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {rooms?.map((room) => (
            <Card key={room.code}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold tracking-[0.2em]">{room.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {room.game} · {room.mode} · {room.visibility} · {room.phase}
                    {room.phase === 'playing' ? ` (round ${room.round}/${room.rounds})` : ''}
                  </p>
                </div>

                <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
                  <span className="text-xs text-muted-foreground">
                    {room.players
                      .map((player) => `${player.name}${player.connected ? '' : ' (away)'}`)
                      .join(', ') || 'empty'}
                  </span>

                  <form action={close}>
                    <input type="hidden" name="code" value={room.code} />
                    <Button size="sm" variant="ghost" type="submit">
                      Close
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
