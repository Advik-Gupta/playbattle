import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import { getProfile, hasDatabase } from '@/lib/db';
import { Button } from '@/components/ui/button';

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const profile = await getProfile(session.user.id);
  if (hasDatabase && !profile?.displayName) redirect('/onboarding');

  return (
    <main className="container flex min-h-dvh flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">playbattle</h1>
      <p className="text-sm text-muted-foreground">
        hey {profile?.displayName ?? session.user.name}
      </p>

      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/signin' });
        }}
      >
        <Button type="submit" variant="ghost" size="sm">
          sign out
        </Button>
      </form>
    </main>
  );
}
