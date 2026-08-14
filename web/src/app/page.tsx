import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import { Button } from '@/components/ui/button';

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect('/signin');

  return (
    <main className="container flex min-h-dvh flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">playbattle</h1>
      <p className="text-sm text-muted-foreground">
        signed in as {session.user.name ?? session.user.email}
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
