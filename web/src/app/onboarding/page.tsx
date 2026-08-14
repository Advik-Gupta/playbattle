import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getProfile, saveProfile } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default async function Onboarding() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const profile = await getProfile(session.user.id);
  if (profile?.displayName) redirect('/');

  async function save(formData: FormData) {
    'use server';

    const current = await auth();
    if (!current?.user?.id) redirect('/signin');

    const displayName = String(formData.get('displayName') ?? '')
      .trim()
      .slice(0, 20);

    if (displayName.length < 2) return;

    await saveProfile(current.user.id, {
      displayName,
      email: current.user.email ?? '',
      name: current.user.name ?? '',
    });

    redirect('/');
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">pick a name</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              this is what other players will see
            </p>
          </div>

          <form action={save} className="flex flex-col gap-3">
            <Input
              name="displayName"
              placeholder="your name"
              maxLength={20}
              autoComplete="off"
              defaultValue={session.user.name ?? ''}
              required
            />
            <Button type="submit" size="lg">
              continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
