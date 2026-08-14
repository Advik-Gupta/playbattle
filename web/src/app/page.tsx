import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getProfile, hasDatabase } from '@/lib/db';
import { SiteHeader } from '@/components/site-header';

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const profile = await getProfile(session.user.id);
  if (hasDatabase && !profile?.displayName) redirect('/onboarding');

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main className="container py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          hey {profile?.displayName ?? session.user.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">no games yet</p>
      </main>
    </div>
  );
}
