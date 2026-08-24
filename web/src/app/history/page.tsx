import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { matchPage, type GameKey } from '@/lib/db';
import { GAME_LIST } from '@/components/games/registry';
import { MatchHistory } from '@/components/match-history';
import { MobileNav } from '@/components/mobile-nav';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 20;

const RESULTS = [
  { value: 'all', label: 'All' },
  { value: 'won', label: 'Wins' },
  { value: 'lost', label: 'Losses' },
] as const;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; game?: string; result?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const params = await searchParams;
  const requested = Math.max(1, Number(params.page ?? '1') || 1);

  const game = (GAME_LIST.some((entry) => entry.id === params.game) ? params.game : 'all') as
    | GameKey
    | 'all';
  const result = (RESULTS.some((entry) => entry.value === params.result)
    ? params.result
    : 'all') as 'all' | 'won' | 'lost';

  const { matches, total, page } = await matchPage(session.user.id, requested, PAGE_SIZE, {
    game,
    result,
  });

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const query = (next: { game?: string; result?: string; page?: string }) => {
    const merged = { game: String(game), result: String(result), page: '1', ...next };
    return `/history?game=${merged.game}&result=${merged.result}&page=${merged.page}`;
  };

  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <SiteHeader />

      <main className="container max-w-3xl py-8 sm:py-10">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Game history</h1>
        <p className="mb-6 text-sm text-muted-foreground">{total} matches played</p>

        <div className="mb-3 flex flex-wrap gap-2">
          <Button asChild size="sm" variant={game === 'all' ? 'default' : 'outline'}>
            <Link href={query({ game: 'all' })}>All games</Link>
          </Button>

          {GAME_LIST.map((entry) => (
            <Button
              key={entry.id}
              asChild
              size="sm"
              variant={game === entry.id ? 'default' : 'outline'}
            >
              <Link href={query({ game: entry.id })}>{entry.name}</Link>
            </Button>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {RESULTS.map((entry) => (
            <Button
              key={entry.value}
              asChild
              size="sm"
              variant={result === entry.value ? 'default' : 'outline'}
            >
              <Link href={query({ result: entry.value })}>{entry.label}</Link>
            </Button>
          ))}
        </div>

        <MatchHistory
          matches={matches}
          userId={session.user.id}
          empty="Nothing matches that filter."
        />

        {pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            {page <= 1 ? (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href={query({ page: String(page - 1) })}>Previous</Link>
              </Button>
            )}

            <span className="text-sm text-muted-foreground">
              Page {page} of {pages}
            </span>

            {page >= pages ? (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href={query({ page: String(page + 1) })}>Next</Link>
              </Button>
            )}
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
