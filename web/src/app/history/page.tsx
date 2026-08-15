import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { matchPage } from '@/lib/db';
import { MatchHistory } from '@/components/match-history';
import { SiteHeader } from '@/components/site-header';
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
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const { matches, total } = await matchPage(session.user.id, page, PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main className="container max-w-3xl py-10">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Game history</h1>

        <MatchHistory matches={matches} userId={session.user.id} />

        {pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <Button asChild variant="outline" size="sm" disabled={page <= 1}>
              <Link href={`/history?page=${Math.max(1, page - 1)}`}>Previous</Link>
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {pages}
            </span>
            <Button asChild variant="outline" size="sm" disabled={page >= pages}>
              <Link href={`/history?page=${Math.min(pages, page + 1)}`}>Next</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
