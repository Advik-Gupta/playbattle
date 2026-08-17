import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { displayNameTaken, getProfile, saveProfile } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const MESSAGES: Record<string, string> = {
  short: 'Names need at least two characters.',
  taken: 'Someone already has that name.',
};

export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const profile = await getProfile(session.user.id);
  if (profile?.displayName) redirect('/');

  const error = (await searchParams).error ?? '';

  async function save(formData: FormData) {
    'use server';

    const current = await auth();
    if (!current?.user?.id) redirect('/signin');

    const displayName = String(formData.get('displayName') ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 20);

    if (displayName.length < 2) redirect('/onboarding?error=short');
    if (await displayNameTaken(displayName, current.user.id)) {
      redirect('/onboarding?error=taken');
    }

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
            {error && <p className="text-sm text-red-500">{MESSAGES[error] ?? 'Try again.'}</p>}
            <Button type="submit" size="lg">
              continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
