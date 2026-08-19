import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { matchPage } from '@/lib/db';
import { MatchHistory } from '@/components/match-history';
import { SiteHeader } from '@/components/site-header';
import { MobileNav } from '@/components/mobile-nav';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 20;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const params = await searchParams;
  const requested = Math.max(1, Number(params.page ?? '1') || 1);
  const { matches, total, page } = await matchPage(session.user.id, requested, PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <SiteHeader />

      <main className="container max-w-3xl py-10">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Game history</h1>

        <MatchHistory matches={matches} userId={session.user.id} />

        {pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <PageLink href={`/history?page=${page - 1}`} disabled={page <= 1}>
              Previous
            </PageLink>
            <span className="text-sm text-muted-foreground">
              Page {page} of {pages}
            </span>
            <PageLink href={`/history?page=${page + 1}`} disabled={page >= pages}>
              Next
            </PageLink>
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  }

  return (
    <Button asChild variant="outline" size="sm">
      <Link href={href}>{children}</Link>
    </Button>
  );
}
