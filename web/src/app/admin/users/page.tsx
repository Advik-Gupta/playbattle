import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adminUserPage, setBanned } from '@/lib/db';
import { syncBans } from '@/lib/game-server';
import { isAdmin, signOut } from '@/lib/admin';
import { AdminNav } from '@/components/admin/admin-nav';
import { Pager } from '@/components/admin/pager';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 20;

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin');

  const params = await searchParams;
  const requested = Math.max(1, Number(params.page ?? '1') || 1);
  const query = params.q?.trim() ?? '';
  const { users, total, page } = await adminUserPage(query, requested, PAGE_SIZE);

  async function lock() {
    'use server';
    await signOut();
    redirect('/admin');
  }

  async function toggleBan(formData: FormData) {
    'use server';

    if (!(await isAdmin())) redirect('/admin');

    const userId = String(formData.get('userId') ?? '');
    const banned = formData.get('banned') === 'yes';
    if (userId) {
      await setBanned(userId, banned);
      await syncBans(userId);
    }

    revalidatePath('/admin/users');
  }

  return (
    <>
      <AdminNav signOutAction={lock} />

      <main className="container py-8">
        <form className="mb-6 flex max-w-sm gap-2">
          <Input name="q" defaultValue={query} placeholder="Name or email" />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>

        <div className="space-y-2">
          {users.length === 0 && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Nothing here.
              </CardContent>
            </Card>
          )}

          {users.map((user) => (
            <Card key={user.userId}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {user.displayName}
                    {user.banned && (
                      <span className="ml-2 rounded bg-red-500/15 px-1.5 py-0.5 text-xs text-red-500">
                        banned
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email || 'no email'} · joined {user.joined ?? 'unknown'}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    {user.won}/{user.played} wins
                  </span>
                  <span>{user.soloPlayed} solo</span>
                  <span className="tabular-nums">{user.points} pts</span>

                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/admin/sanctions?user=${user.userId}`}>Sanction</Link>
                  </Button>

                  <form action={toggleBan}>
                    <input type="hidden" name="userId" value={user.userId} />
                    <input type="hidden" name="banned" value={user.banned ? 'no' : 'yes'} />
                    <Button size="sm" variant={user.banned ? 'outline' : 'ghost'} type="submit">
                      {user.banned ? 'Unban' : 'Ban'}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Pager base="/admin/users" page={page} total={total} size={PAGE_SIZE} query={query} />
      </main>
    </>
  );
}
