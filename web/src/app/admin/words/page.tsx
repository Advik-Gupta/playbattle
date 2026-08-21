import { redirect } from 'next/navigation';
import { isAdmin, signOut } from '@/lib/admin';
import { wordStats } from '@/lib/db';
import { AdminNav } from '@/components/admin/admin-nav';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AdminWords() {
  if (!(await isAdmin())) redirect('/admin');

  const { hardest, easiest } = await wordStats();

  async function lock() {
    'use server';
    await signOut();
    redirect('/admin');
  }

  return (
    <>
      <AdminNav signOutAction={lock} />

      <main className="container max-w-3xl space-y-6 py-8">
        <h1 className="text-lg font-semibold tracking-tight">Word difficulty</h1>

        {hardest.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Words need at least two plays before they show up here.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Hardest', rows: hardest },
              { title: 'Easiest', rows: easiest },
            ].map((group) => (
              <Card key={group.title}>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {group.title}
                  </p>

                  <div className="mt-3 space-y-2">
                    {group.rows.map((word) => (
                      <div key={word.word} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-mono uppercase tracking-wide">{word.word}</span>
                          <span className="text-xs text-muted-foreground">
                            {word.solved}/{word.seen} solved
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded bg-muted">
                          <div
                            className={
                              word.rate < 50 ? 'h-full bg-red-500/70' : 'h-full bg-emerald-500/70'
                            }
                            style={{ width: `${Math.max(3, word.rate)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
