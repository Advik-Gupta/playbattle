import { redirect } from 'next/navigation';
import { adminMatchPage } from '@/lib/db';
import { isAdmin, signOut } from '@/lib/admin';
import { AdminNav } from '@/components/admin/admin-nav';
import { Pager } from '@/components/admin/pager';
import { Card, CardContent } from '@/components/ui/card';

const PAGE_SIZE = 20;

export default async function AdminMatches({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin');

  const page = Math.max(1, Number((await searchParams).page ?? '1') || 1);
  const { matches, total } = await adminMatchPage(page, PAGE_SIZE);

  async function lock() {
    'use server';
    await signOut();
    redirect('/admin');
  }

  return (
    <>
      <AdminNav signOutAction={lock} />

      <main className="container py-8">
        <div className="space-y-2">
          {matches.length === 0 && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No matches recorded.
              </CardContent>
            </Card>
          )}

          {matches.map((match) => (
            <Card key={match.matchId}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {match.players.map((player) => `${player.name} (${player.score})`).join(' vs ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {match.game ?? 'wordbattle'} · {match.mode} · {match.rounds.length} rounds
                    {match.rounds.some((round) => round.answer)
                      ? ` · ${match.rounds.map((round) => round.answer).filter(Boolean).join(', ')}`
                      : ''}
                  </p>
                </div>

                <div className="text-right text-xs text-muted-foreground">
                  <p className="font-mono">{match.code}</p>
                  <p>{new Date(match.playedAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Pager base="/admin/matches" page={page} total={total} size={PAGE_SIZE} />
      </main>
    </>
  );
}
