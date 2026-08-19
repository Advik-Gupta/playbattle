import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getProfile } from '@/lib/db';
import type { GameId } from '@/lib/protocol';
import { GAME_LIST, gameMeta } from '@/components/games/registry';
import { RoomPanel } from '@/components/room-panel';
import { SiteHeader } from '@/components/site-header';
import { MobileNav } from '@/components/mobile-nav';

export function generateStaticParams() {
  return GAME_LIST.map((game) => ({ game: game.id }));
}

export default async function PlayGamePage({ params }: { params: Promise<{ game: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const { game } = await params;
  if (!GAME_LIST.some((entry) => entry.id === game)) notFound();

  const meta = gameMeta(game as GameId);
  const profile = await getProfile(session.user.id);

  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <SiteHeader />

      <main className="container max-w-xl py-8 sm:py-10">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">
          {profile?.displayName ? `Let's go, ${profile.displayName}` : meta.name}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">{meta.tagline}</p>

        <RoomPanel userId={session.user.id} game={meta.id} />
      </main>

      <MobileNav />
    </div>
  );
}
