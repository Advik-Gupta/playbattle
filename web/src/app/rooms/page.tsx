import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { RoomBrowser } from '@/components/room-browser';
import { SiteHeader } from '@/components/site-header';

export default async function RoomsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main className="container max-w-2xl py-10">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Public rooms</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Anyone can drop into these. The list refreshes on its own.
        </p>

        <RoomBrowser />
      </main>
    </div>
  );
}
