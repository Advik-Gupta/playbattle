import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';

export default async function SignIn() {
  const session = await auth();
  if (session?.user) redirect('/');

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">playbattle</h1>
        <p className="mt-1 text-sm text-neutral-500">sign in to play</p>
      </div>

      <form
        action={async () => {
          'use server';
          await signIn('google', { redirectTo: '/' });
        }}
      >
        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          continue with google
        </button>
      </form>
    </main>
  );
}
