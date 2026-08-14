import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect('/signin');

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">playbattle</h1>
      <p className="text-sm text-neutral-500">
        signed in as {session.user.name ?? session.user.email}
      </p>

      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/signin' });
        }}
      >
        <button type="submit" className="text-sm text-neutral-500 underline underline-offset-4">
          sign out
        </button>
      </form>
    </main>
  );
}
