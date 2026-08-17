'use client';

import { useEffect, useState } from 'react';
import type { PlayerCard } from '@/lib/db';
import type { PresenceEntry, PresenceStatus } from '@/lib/protocol';
import { useSocket } from '@/lib/socket';
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

  useEffect(() => {
    if (!socket || status !== 'online') return;

    const ids = friends.map((friend) => friend.userId);
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
  }, [socket, status, friends]);

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
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[state]}`} />
                  <span className="truncate">{friend.displayName}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {LABEL[state]} · {friend.won}/{friend.played}
                </p>
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
