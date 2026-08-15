import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getProfile, hasDatabase } from '@/lib/db';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
        <p className="mt-1 text-sm text-muted-foreground">Pick a room and get going.</p>

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
      </main>
    </div>
  );
}
