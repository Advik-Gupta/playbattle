import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { getProfile } from '@/lib/db';
import { UserMenu } from '@/components/user-menu';
import { ConnectionStatus } from '@/components/connection-status';
import { Realtime } from '@/components/realtime';

export async function SiteHeader() {
  const session = await auth();
  const profile = session?.user?.id ? await getProfile(session.user.id) : null;
  const name = profile?.displayName || session?.user?.name || 'player';

  async function handleSignOut() {
    'use server';
    await signOut({ redirectTo: '/signin' });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            P
          </span>
          <span className="text-[15px] font-semibold tracking-tight">playbattle</span>
        </Link>

        {session?.user && (
          <div className="flex items-center gap-4">
            <ConnectionStatus />
            <UserMenu name={name} signOutAction={handleSignOut} />
            <Realtime />
          </div>
        )}
      </div>
    </header>
  );
}
