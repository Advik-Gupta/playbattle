import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { BAN_DURATIONS, issueSanction, liftSanction, sanctionPage } from '@/lib/db';
import { isAdmin, signOut } from '@/lib/admin';
import { syncBans } from '@/lib/game-server';
import { AdminNav } from '@/components/admin/admin-nav';
import { Pager } from '@/components/admin/pager';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 20;

export default async function AdminSanctions({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; done?: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin');

  const params = await searchParams;
  const requested = Math.max(1, Number(params.page ?? '1') || 1);
  const { sanctions, total, page } = await sanctionPage(requested, PAGE_SIZE);

  async function lock() {
    'use server';
    await signOut();
    redirect('/admin');
  }

  async function issue(formData: FormData) {
    'use server';

    if (!(await isAdmin())) redirect('/admin');

    const userId = String(formData.get('userId') ?? '').trim();
    const kind = String(formData.get('kind') ?? 'warn') === 'ban' ? 'ban' : 'warn';
    const reason = String(formData.get('reason') ?? '').trim();
    const hours = Number(formData.get('hours') ?? '0') || 0;

    if (!userId) redirect('/admin/sanctions?done=missing');

    await issueSanction({ userId, kind, reason, hours, actor: 'admin' });
    if (kind === 'ban') await syncBans(userId);

    revalidatePath('/admin/sanctions');
    redirect('/admin/sanctions?done=issued');
  }

  async function lift(formData: FormData) {
    'use server';

    if (!(await isAdmin())) redirect('/admin');

    const id = String(formData.get('id') ?? '');
    const userId = String(formData.get('userId') ?? '');

    if (id) {
      await liftSanction(id);
      if (userId) await syncBans(userId);
    }

    revalidatePath('/admin/sanctions');
  }

  return (
    <>
      <AdminNav signOutAction={lock} />

      <main className="container max-w-3xl py-8">
        <Card className="mb-6">
          <CardContent className="space-y-4 p-6">
            <h1 className="text-lg font-semibold tracking-tight">Issue a sanction</h1>

            <form action={issue} className="grid gap-3 sm:grid-cols-2">
              <Input name="userId" placeholder="user id" required />
              <Input name="reason" placeholder="reason" maxLength={200} />

              <select
                name="kind"
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="warn">warning</option>
                <option value="ban">ban</option>
              </select>

              <select
                name="hours"
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                {BAN_DURATIONS.map((duration) => (
                  <option key={duration.label} value={duration.hours}>
                    {duration.label}
                  </option>
                ))}
              </select>

              <Button type="submit" className="sm:col-span-2">
                Apply
              </Button>
            </form>

            {params.done === 'issued' && <p className="text-sm text-emerald-500">Applied.</p>}
            {params.done === 'missing' && <p className="text-sm text-red-500">Need a user id.</p>}
          </CardContent>
        </Card>

        <div className="space-y-2">
          {sanctions.length === 0 && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Nothing issued yet.
              </CardContent>
            </Card>
          )}

          {sanctions.map((sanction) => {
            const expired = sanction.until ? new Date(sanction.until).getTime() < Date.now() : false;
            const live = !sanction.liftedAt && !expired;

            return (
              <Card key={String(sanction._id)}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {sanction.kind === 'ban' ? 'Ban' : 'Warning'} · {sanction.userId}
                      {!live && (
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {sanction.liftedAt ? 'lifted' : 'expired'}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {sanction.reason || 'no reason given'} ·{' '}
                      {sanction.until
                        ? `until ${new Date(sanction.until).toLocaleString()}`
                        : sanction.kind === 'ban'
                          ? 'permanent'
                          : 'notice only'}
                    </p>
                  </div>

                  {live && (
                    <form action={lift}>
                      <input type="hidden" name="id" value={String(sanction._id)} />
                      <input type="hidden" name="userId" value={sanction.userId} />
                      <Button size="sm" variant="outline" type="submit">
                        Lift
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Pager base="/admin/sanctions" page={page} total={total} size={PAGE_SIZE} />
      </main>
    </>
  );
}
