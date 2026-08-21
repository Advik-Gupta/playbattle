'use client';

import { useEffect, useState } from 'react';
import type { GameInvite } from '@/lib/protocol';
import { useSocket } from '@/lib/socket';
import { gameMeta } from '@/components/games/registry';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/ui/button';

export function InviteDialog() {
  const socket = useSocket((s) => s.socket);
  const [invite, setInvite] = useState<GameInvite | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!socket) return;

    const onInvite = (payload: GameInvite) => {
      setError('');
      setInvite(payload);
    };

    socket.on('invite:received', onInvite);
    return () => {
      socket.off('invite:received', onInvite);
    };
  }, [socket]);

  useEffect(() => {
    if (!invite) return;

    const id = setTimeout(() => setInvite(null), 30_000);
    return () => clearTimeout(id);
  }, [invite]);

  if (!invite) return null;

  function accept() {
    if (!socket || !invite) return;

    socket.emit('room:join', invite.code, (res) => {
      if (res.ok) setInvite(null);
      else setError(res.error);
    });
  }

  return (
    <div className="slide-up fixed bottom-4 left-4 z-50 w-72 rounded-xl border border-border bg-card p-4 shadow-lg">
      <div className="flex items-center gap-2">
        <Avatar id={invite.fromAvatar} name={invite.fromName} size={28} />
        <p className="text-sm font-medium">{invite.fromName} invited you</p>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {gameMeta(invite.game).name} · room {invite.code}
      </p>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={accept}>
          Join
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setInvite(null)}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
