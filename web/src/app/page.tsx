import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { databaseReady, friendList, getProfile, hasDatabase } from '@/lib/db';
import { setWordStatus, vocabCounts, wordToReview } from '@/lib/vocab';
import { acknowledgeNotices, markAchievementsSeen, myNotices, unseenAchievements, vocabTotal } from '@/lib/db';
import { describe } from '@/lib/achievements';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FriendList } from '@/components/friend-list';
import { MobileNav } from '@/components/mobile-nav';
import { GAME_LIST } from '@/components/games/registry';
import { WordReview } from '@/components/word-review';
import { NoticeDialog } from '@/components/notice-dialog';
import { BadgePopup } from '@/components/badge-popup';

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const online = hasDatabase ? await databaseReady() : false;
  const profile = online ? await getProfile(session.user.id) : null;
  if (online && !profile?.displayName) redirect('/onboarding');

  const userId = session.user.id;
  const [friends, words, review, notices, fresh, wordTotal] = online
    ? await Promise.all([
        friendList(userId),
        vocabCounts(userId),
        wordToReview(userId),
        myNotices(userId),
        unseenAchievements(userId),
        vocabTotal(userId),
      ])
    : [[], { total: 0, learning: 0, known: 0 }, null, [], [], 0];

  const unlocked =
    profile && fresh.length > 0
      ? describe(profile, wordTotal, []).filter((badge) => fresh.includes(badge.id))
      : [];

  async function noop() {
    'use server';
  }

  async function acknowledge() {
    'use server';
    await acknowledgeNotices(userId);
  }

  async function seenBadges() {
    'use server';
    await markAchievementsSeen(userId);
  }

  async function markKnown(formData: FormData) {
    'use server';

    const word = String(formData.get('word') ?? '');
    if (word) await setWordStatus(userId, word, 'known');
  }

  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <SiteHeader />
      <NoticeDialog
        notices={notices.map((notice) => ({
          _id: String(notice._id),
          kind: notice.kind,
          reason: notice.reason,
          until: notice.until,
        }))}
        acknowledgeAction={acknowledge}
      />
      <BadgePopup badges={unlocked} acknowledgeAction={seenBadges} />
      <WordReview word={review} markKnown={markKnown} />

      <main className="container py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          hey {profile?.displayName ?? session.user.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick a room and get going.</p>

        {hasDatabase && !online && (
          <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
            Cannot reach the database, so profiles and stats are paused. Games still work.
          </p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {GAME_LIST.map((game) => {
            const Icon = game.icon;

            return (
              <Link key={game.id} href={`/play/${game.id}`} className="group">
                <Card className="relative h-full overflow-hidden transition-transform group-hover:-translate-y-0.5">
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${game.accent}`}
                  />
                  <CardContent className="relative flex h-full flex-col gap-3 p-6">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-card ring-1 ring-border">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold tracking-tight">{game.name}</p>
                      <p className="text-sm text-muted-foreground">{game.tagline}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{game.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 max-w-md">
          <Card className="mb-4">
            <CardContent className="flex items-center justify-between gap-4 p-6">
              <div>
                <p className="font-semibold tracking-tight">Daily word</p>
                <p className="text-sm text-muted-foreground">
                  {profile?.daily?.streak
                    ? `${profile.daily.streak} day streak going`
                    : 'One word a day, same for everyone.'}
                </p>
              </div>
              <Button asChild>
                <Link href="/daily">Play</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardContent className="flex items-center justify-between gap-4 p-6">
              <div>
                <p className="font-semibold tracking-tight">Tournaments</p>
                <p className="text-sm text-muted-foreground">
                  Four or eight players, one winner.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/tournaments">Open</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between gap-4 p-6">
              <div>
                <p className="font-semibold tracking-tight">My words</p>
                <p className="text-sm text-muted-foreground">
                  {words.total > 0
                    ? `${words.learning} learning · ${words.known} known`
                    : 'Words you meet in games land here.'}
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/dictionary">Open</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 max-w-md">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Friends</h2>
          <FriendList friends={friends} removeAction={noop} />
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
