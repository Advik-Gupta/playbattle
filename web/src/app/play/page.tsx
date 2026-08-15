import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getProfile } from '@/lib/db';
import { RoomPanel } from '@/components/room-panel';
import { SiteHeader } from '@/components/site-header';

export default async function PlayPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const profile = await getProfile(session.user.id);

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="container max-w-xl py-10">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">
          {profile?.displayName ? `Let's go, ${profile.displayName}` : 'Play'}
        </h1>
        <RoomPanel userId={session.user.id} />
      </main>
    </div>
  );
}
