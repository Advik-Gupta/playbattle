'use client';

import { useEffect, useState } from 'react';
import type { PlayerCard } from '@/lib/db';
import type { PresenceEntry, PresenceStatus } from '@/lib/protocol';
import { useSocket } from '@/lib/socket';
import Link from 'next/link';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const DOT: Record<PresenceStatus, string> = {
  online: 'bg-emerald-500',
  playing: 'bg-amber-500',
  offline: 'bg-muted-foreground/40',
};

const LABEL: Record<PresenceStatus, string> = {
  online: 'online',
  playing: 'in a game',
  offline: 'offline',
};

export function FriendList({
  friends,
  removeAction,
}: {
  friends: PlayerCard[];
  removeAction: (formData: FormData) => Promise<void>;
}) {
  const socket = useSocket((s) => s.socket);
  const status = useSocket((s) => s.status);
  const room = useSocket((s) => s.room);
  const [presence, setPresence] = useState<Record<string, PresenceEntry>>({});
  const [sent, setSent] = useState<Record<string, string>>({});

  const watchKey = friends.map((friend) => friend.userId).join(',');

  useEffect(() => {
    if (!socket || status !== 'online') return;

    const ids = watchKey ? watchKey.split(',') : [];
    socket.emit('presence:watch', ids, (res) => {
      if (!res.ok) return;
      setPresence(Object.fromEntries(res.data.map((entry) => [entry.userId, entry])));
    });

    const onUpdate = (entry: PresenceEntry) =>
      setPresence((current) => ({ ...current, [entry.userId]: entry }));

    socket.on('presence:update', onUpdate);
    return () => {
      socket.off('presence:update', onUpdate);
    };
  }, [socket, status, watchKey]);

  function invite(userId: string) {
    if (!socket) return;

    socket.emit('invite:send', userId, (res) => {
      setSent((current) => ({ ...current, [userId]: res.ok ? 'invited' : res.error }));
    });
  }

  if (friends.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No friends yet. Search for someone above.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {friends.map((friend) => {
        const entry = presence[friend.userId];
        const state: PresenceStatus = entry?.status ?? 'offline';

        return (
          <Card key={friend.userId}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="relative">
                  <Avatar id={friend.avatar} name={friend.displayName} size={34} />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${DOT[state]}`}
                  />
                </span>

                <div className="min-w-0">
                  <Link
                    href={`/u/${friend.userId}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {friend.displayName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {LABEL[state]} · {friend.won}/{friend.played}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {sent[friend.userId] && (
                  <span className="text-xs text-muted-foreground">{sent[friend.userId]}</span>
                )}

                {room && state !== 'offline' && (
                  <Button size="sm" variant="outline" onClick={() => invite(friend.userId)}>
                    Invite
                  </Button>
                )}

                <form action={removeAction}>
                  <input type="hidden" name="userId" value={friend.userId} />
                  <Button size="sm" variant="ghost" type="submit">
                    Remove
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
