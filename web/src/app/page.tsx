import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { databaseReady, friendList, getProfile, hasDatabase } from '@/lib/db';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FriendList } from '@/components/friend-list';

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const online = hasDatabase ? await databaseReady() : false;
  const profile = online ? await getProfile(session.user.id) : null;
  if (online && !profile?.displayName) redirect('/onboarding');

  const friends = online ? await friendList(session.user.id) : [];

  async function noop() {
    'use server';
  }

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main className="container py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          hey {profile?.displayName ?? session.user.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick a room and get going.</p>

        {hasDatabase && !online && (
          <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
            Cannot reach the database, so profiles and stats are paused. Games still work.
          </p>
        )}

        <Card className="mt-6 max-w-md">
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <div>
              <p className="font-semibold tracking-tight">WordBattle</p>
              <p className="text-sm text-muted-foreground">Guess the word before they do.</p>
            </div>
            <Button asChild>
              <Link href="/play">Play</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="mt-10 max-w-md">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Friends</h2>
          <FriendList friends={friends} removeAction={noop} />
        </div>
      </main>
    </div>
  );
}
