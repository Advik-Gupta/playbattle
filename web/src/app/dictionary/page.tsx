import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { forgetWord, setWordStatus, vocabCounts, vocabPage, type WordStatus } from '@/lib/vocab';
import { SiteHeader } from '@/components/site-header';
import { MobileNav } from '@/components/mobile-nav';
import { WordCard } from '@/components/word-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatTile } from '@/components/stat-tile';

const PAGE_SIZE = 24;
const FILTERS: { value: WordStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'learning', label: 'Learning' },
  { value: 'known', label: 'Known' },
];

export default async function DictionaryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const userId = session.user.id;
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const status = (
    FILTERS.some((filter) => filter.value === params.status) ? params.status : 'all'
  ) as WordStatus | 'all';

  const [{ words, total }, counts] = await Promise.all([
    vocabPage(userId, status, page, PAGE_SIZE),
    vocabCounts(userId),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function updateStatus(formData: FormData) {
    'use server';

    const word = String(formData.get('word') ?? '');
    const next = String(formData.get('status') ?? '') as WordStatus;
    if (word && (next === 'known' || next === 'learning')) {
      await setWordStatus(userId, word, next);
    }

    revalidatePath('/dictionary');
  }

  async function forget(formData: FormData) {
    'use server';

    const word = String(formData.get('word') ?? '');
    if (word) await forgetWord(userId, word);

    revalidatePath('/dictionary');
  }

  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <SiteHeader />

      <main className="container max-w-3xl py-8 sm:py-10">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">My words</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Every answer you meet in a game lands here.
        </p>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatTile label="Total" value={String(counts.total)} />
          <StatTile label="Learning" value={String(counts.learning)} />
          <StatTile label="Known" value={String(counts.known)} />
        </div>

        <div className="mb-4 flex gap-2">
          {FILTERS.map((filter) => (
            <Button
              key={filter.value}
              asChild
              size="sm"
              variant={status === filter.value ? 'default' : 'outline'}
            >
              <Link href={`/dictionary?status=${filter.value}`}>{filter.label}</Link>
            </Button>
          ))}
        </div>

        {words.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nothing here yet. Finish a game and the words show up.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {words.map((entry) => (
              <WordCard
                key={entry.word}
                entry={entry}
                statusAction={updateStatus}
                forgetAction={forget}
              />
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            {page <= 1 ? (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dictionary?status=${status}&page=${page - 1}`}>Previous</Link>
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
                <Link href={`/dictionary?status=${status}&page=${page + 1}`}>Next</Link>
              </Button>
            )}
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
