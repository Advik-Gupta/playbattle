'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TournamentState } from '@/lib/protocol';
import { useSocket } from '@/lib/socket';
import { gameMeta } from '@/components/games/registry';
import { Avatar } from '@/components/avatar';
import { Bracket } from '@/components/bracket';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function TournamentPanel({ code, userId }: { code: string; userId: string }) {
  const socket = useSocket((s) => s.socket);
  const status = useSocket((s) => s.status);
  const room = useSocket((s) => s.room);
  const router = useRouter();

  const [state, setState] = useState<TournamentState | null>(null);
  const [error, setError] = useState('');
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onState = (next: TournamentState) => {
      if (next.code === code) setState(next);
    };

    const onClosed = (reason: string) => setError(reason);

    socket.on('tournament:state', onState);
    socket.on('tournament:closed', onClosed);

    return () => {
      socket.off('tournament:state', onState);
      socket.off('tournament:closed', onClosed);
    };
  }, [socket, code]);

  useEffect(() => {
    if (!socket || status !== 'online' || asked) return;

    setAsked(true);
    socket.emit('tournament:watch', code, (res) => {
      if (res.ok) setState(res.data);
      else setError(res.error);
    });
  }, [socket, status, code, asked]);

  useEffect(() => {
    if (room) router.push('/play/' + room.config.game);
  }, [room, router]);

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-red-500">{error}</CardContent>
      </Card>
    );
  }

  if (!state) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading bracket…</CardContent>
      </Card>
    );
  }

  const joined = state.players.some((seat) => seat.userId === userId);
  const isHost = state.hostId === userId;
  const meta = gameMeta(state.game);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xl font-semibold tracking-[0.3em]">{state.code}</p>
              <p className="text-xs text-muted-foreground">
                {meta.name} · {state.players.length}/{state.size} players · {state.phase}
              </p>
            </div>

            <div className="flex gap-2">
              {state.phase === 'lobby' && !joined && (
                <Button
                  onClick={() =>
                    socket?.emit('tournament:join', code, (res) => {
                      if (!res.ok) setError(res.error);
                    })
                  }
                >
                  Join
                </Button>
              )}

              {state.phase === 'lobby' && joined && !isHost && (
                <Button
                  variant="outline"
                  onClick={() => socket?.emit('tournament:leave', () => undefined)}
                >
                  Leave
                </Button>
              )}

              {state.phase === 'lobby' && isHost && (
                <Button
                  onClick={() =>
                    socket?.emit('tournament:start', (res) => {
                      if (!res.ok) setError(res.error);
                    })
                  }
                >
                  Start
                </Button>
              )}
            </div>
          </div>

          {state.phase === 'lobby' && (
            <div className="flex flex-wrap gap-2">
              {state.players.map((seat) => (
                <span
                  key={seat.userId}
                  className="flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-sm"
                >
                  <Avatar id={seat.avatar} name={seat.name} size={22} />
                  {seat.name}
                  {seat.userId === state.hostId && (
                    <span className="text-xs text-muted-foreground">host</span>
                  )}
                </span>
              ))}

              {Array.from({ length: Math.max(0, state.size - state.players.length) }).map(
                (_, index) => (
                  <span
                    key={`empty-${index}`}
                    className="rounded-full border border-dashed border-border px-3 py-1 text-sm text-muted-foreground"
                  >
                    open
                  </span>
                ),
              )}
            </div>
          )}

          {state.phase === 'finished' && (
            <p className="cheer text-center text-lg font-semibold">
              {state.championId === userId
                ? 'You won the whole thing'
                : `${state.players.find((seat) => seat.userId === state.championId)?.name ?? 'Nobody'} takes it`}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <Bracket state={state} userId={userId} />
        </CardContent>
      </Card>
    </div>
  );
}
