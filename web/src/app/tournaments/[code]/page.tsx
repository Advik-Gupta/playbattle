import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { MobileNav } from '@/components/mobile-nav';
import { SiteHeader } from '@/components/site-header';
import { TournamentPanel } from '@/components/tournament-panel';

export default async function TournamentPage({ params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const { code } = await params;

  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <SiteHeader />

      <main className="container max-w-3xl py-8 sm:py-10">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Tournament</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Single elimination. Win your match and you move up.
        </p>

        <TournamentPanel code={code.toUpperCase()} userId={session.user.id} />
      </main>

      <MobileNav />
    </div>
  );
}
