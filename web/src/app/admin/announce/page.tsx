import { redirect } from 'next/navigation';
import { isAdmin, signOut } from '@/lib/admin';
import { announce } from '@/lib/game-server';
import { AdminNav } from '@/components/admin/admin-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default async function AdminAnnounce({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin');

  const params = await searchParams;

  async function lock() {
    'use server';
    await signOut();
    redirect('/admin');
  }

  async function send(formData: FormData) {
    'use server';

    if (!(await isAdmin())) redirect('/admin');

    const message = String(formData.get('message') ?? '').trim().slice(0, 200);
    if (!message) redirect('/admin/announce?error=empty');

    const sent = await announce(message);
    if (!sent) redirect('/admin/announce?error=server');

    redirect('/admin/announce?sent=1');
  }

  return (
    <>
      <AdminNav signOutAction={lock} />

      <main className="container max-w-lg py-8">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Announcement</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Goes to everyone connected right now.
              </p>
            </div>

            <form action={send} className="flex flex-col gap-3">
              <Input name="message" placeholder="Server restarting in 5 minutes" maxLength={200} />
              <Button type="submit">Send</Button>
            </form>

            {params.sent === '1' && <p className="text-sm text-emerald-500">Sent.</p>}
            {params.error === 'empty' && <p className="text-sm text-red-500">Write something.</p>}
            {params.error === 'server' && (
              <p className="text-sm text-red-500">Game server did not accept it.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
