import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { matchById } from '@/lib/db';
import { gameMeta } from '@/components/games/registry';
import { MobileNav } from '@/components/mobile-nav';
import { SiteHeader } from '@/components/site-header';
import { RoundBoards } from '@/components/round-boards';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default async function MatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const { id } = await params;
  const match = await matchById(id, session.user.id);
  if (!match) notFound();

  const meta = gameMeta(match.game ?? 'wordbattle');
  const me = match.players.find((player) => player.userId === session.user.id);
  const won = match.winnerId === session.user.id;
  const drew = match.winnerId === null;

  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <SiteHeader />

      <main className="container max-w-2xl py-8 sm:py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/history">Back to history</Link>
        </Button>

        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {meta.name} · {new Date(match.playedAt).toLocaleString()}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {drew ? 'Draw' : won ? 'You won' : 'You lost'}
          </h1>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="space-y-2">
              {match.players.map((player) => (
                <div key={player.userId} className="flex items-center justify-between text-sm">
                  <span
                    className={
                      player.userId === session.user.id ? 'font-medium text-primary' : 'font-medium'
                    }
                  >
                    {player.name}
                    {match.winnerId === player.userId && (
                      <span className="ml-2 text-xs uppercase text-emerald-500">winner</span>
                    )}
                  </span>
                  <span className="font-mono tabular-nums">{player.score}</span>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              {match.rounds.length} rounds · room {match.code || 'unknown'} · you scored{' '}
              {me?.score ?? 0}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {match.rounds.map((round) => (
            <Card key={round.round}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Round {round.round}</p>
                  {round.answer && (
                    <p className="font-mono text-sm uppercase tracking-[0.2em]">{round.answer}</p>
                  )}
                </div>

                <RoundBoards round={round} players={match.players} userId={session.user.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
