import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { MobileNav } from '@/components/mobile-nav';
import { SiteHeader } from '@/components/site-header';
import { TournamentStarter } from '@/components/tournament-starter';

export default async function TournamentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <SiteHeader />

      <main className="container max-w-xl py-8 sm:py-10">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Tournaments</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Four or eight players, single elimination, last one standing wins.
        </p>

        <TournamentStarter />
      </main>

      <MobileNav />
    </div>
  );
}
