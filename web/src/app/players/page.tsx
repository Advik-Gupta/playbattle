import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
  friendIds,
  pendingRequests,
  removeFriend,
  requestFriend,
  respondToRequest,
  searchPlayers,
  sentRequestIds,
  friendList,
} from '@/lib/db';
import { SiteHeader } from '@/components/site-header';
import { MobileNav } from '@/components/mobile-nav';
import Link from 'next/link';
import { Avatar } from '@/components/avatar';
import { FriendList } from '@/components/friend-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const userId = session.user.id;
  const query = (await searchParams).q?.trim() ?? '';

  const [results, friends, requests, already, sent] = await Promise.all([
    query ? searchPlayers(query, userId) : Promise.resolve([]),
    friendList(userId),
    pendingRequests(userId),
    friendIds(userId),
    sentRequestIds(userId),
  ]);

  async function add(formData: FormData) {
    'use server';
    const target = String(formData.get('userId') ?? '');
    if (target) await requestFriend(userId, target);
    revalidatePath('/players');
  }

  async function respond(formData: FormData) {
    'use server';
    const target = String(formData.get('userId') ?? '');
    const accept = formData.get('accept') === 'yes';
    if (target) await respondToRequest(userId, target, accept);
    revalidatePath('/players');
  }

  async function drop(formData: FormData) {
    'use server';
    const target = String(formData.get('userId') ?? '');
    if (target) await removeFriend(userId, target);
    revalidatePath('/players');
  }

  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <SiteHeader />

      <main className="container max-w-2xl space-y-10 py-10">
        <section>
          <h1 className="mb-4 text-2xl font-semibold tracking-tight">Players</h1>

          <form className="flex gap-2">
            <Input name="q" defaultValue={query} placeholder="Search by name" />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>

          {query && results.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">Nobody matched that name.</p>
          )}

          <div className="mt-4 space-y-2">
            {results.map((player) => {
              const isFriend = already.includes(player.userId);
              const isSent = sent.includes(player.userId);

              return (
                <Card key={player.userId}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar id={player.avatar} name={player.displayName} size={34} />
                      <div className="min-w-0">
                        <Link
                          href={`/u/${player.userId}`}
                          className="block truncate text-sm font-medium hover:underline"
                        >
                          {player.displayName}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {player.won}/{player.played} wins · {player.points} points
                        </p>
                      </div>
                    </div>

                    {isFriend ? (
                      <span className="text-xs text-muted-foreground">friends</span>
                    ) : isSent ? (
                      <span className="text-xs text-muted-foreground">requested</span>
                    ) : (
                      <form action={add}>
                        <input type="hidden" name="userId" value={player.userId} />
                        <Button size="sm" variant="outline" type="submit">
                          Add
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {requests.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">Requests</h2>
            <div className="space-y-2">
              {requests.map((player) => (
                <Card key={player.userId}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <span className="flex items-center gap-3">
                      <Avatar id={player.avatar} name={player.displayName} size={34} />
                      <span className="text-sm font-medium">{player.displayName}</span>
                    </span>
                    <div className="flex gap-2">
                      <form action={respond}>
                        <input type="hidden" name="userId" value={player.userId} />
                        <input type="hidden" name="accept" value="yes" />
                        <Button size="sm" type="submit">
                          Accept
                        </Button>
                      </form>
                      <form action={respond}>
                        <input type="hidden" name="userId" value={player.userId} />
                        <input type="hidden" name="accept" value="no" />
                        <Button size="sm" variant="ghost" type="submit">
                          Ignore
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Friends</h2>
          <FriendList friends={friends} removeAction={drop} />
        </section>
      </main>

      <MobileNav />
    </div>
  );
}
