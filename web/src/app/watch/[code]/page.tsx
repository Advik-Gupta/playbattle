import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { MobileNav } from '@/components/mobile-nav';
import { SiteHeader } from '@/components/site-header';
import { Spectator } from '@/components/spectator';

export default async function WatchPage({ params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const { code } = await params;

  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <SiteHeader />

      <main className="container max-w-2xl py-8 sm:py-10">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Watching</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          You can chat, but you cannot play until a seat opens.
        </p>

        <Spectator code={code.toUpperCase()} userId={session.user.id} />
      </main>

      <MobileNav />
    </div>
  );
}
