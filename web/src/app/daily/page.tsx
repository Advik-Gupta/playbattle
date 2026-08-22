import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dailyBoard, dailyCount, dailyResult, getProfile, todayKey } from '@/lib/db';
import { Avatar } from '@/components/avatar';
import { DailyPanel } from '@/components/daily-panel';
import { MobileNav } from '@/components/mobile-nav';
import { SiteHeader } from '@/components/site-header';
import { StatTile } from '@/components/stat-tile';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function DailyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const userId = session.user.id;
  const day = todayKey();

  const [profile, mine, board, counts] = await Promise.all([
    getProfile(userId),
    dailyResult(userId, day),
    dailyBoard(day, 20),
    dailyCount(day),
  ]);

  const stats = profile?.daily;
  const round = mine?.rounds?.[0];
  const myBoard = round?.boards?.find((entry) => entry.playerId === userId);

  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <SiteHeader />

      <main className="container max-w-2xl py-8 sm:py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Daily word</h1>
        <p className="mb-6 text-sm text-muted-foreground">{day}</p>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Your streak" value={String(stats?.streak ?? 0)} />
          <StatTile label="Best streak" value={String(stats?.bestStreak ?? 0)} />
          <StatTile label="Played today" value={String(counts.played)} />
          <StatTile label="Solved today" value={String(counts.solved)} />
        </div>

        <DailyPanel
          userId={userId}
          day={day}
          alreadyPlayed={Boolean(mine)}
          previous={
            myBoard && round
              ? { words: myBoard.words, answer: round.answer, solved: myBoard.solved }
              : null
          }
        />

        <h2 className="mb-3 mt-10 text-lg font-semibold tracking-tight">Today&apos;s board</h2>

        {board.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nobody has played yet. Go first.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {board.map((entry, index) => (
              <Card
                key={entry.userId}
                className={entry.userId === userId ? 'border-primary' : undefined}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="w-6 text-sm font-semibold tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <Avatar id={entry.avatar} name={entry.displayName} size={30} />
                  <span className="flex-1 truncate text-sm font-medium">{entry.displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {entry.solved ? `${entry.guesses}/6` : 'missed'}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
