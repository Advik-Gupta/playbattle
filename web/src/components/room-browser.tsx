'use client';

import { useCallback, useEffect, useState } from 'react';
import type { OpenRoom } from '@/lib/protocol';
import { useSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const serverUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'http://localhost:4000';

export function RoomBrowser() {
  const socket = useSocket((s) => s.socket);
  const [rooms, setRooms] = useState<OpenRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${serverUrl}/rooms`, { cache: 'no-store' });
      const body = (await res.json()) as { rooms: OpenRoom[] };
      setRooms(body.rooms ?? []);
      setError('');
    } catch {
      setError('Cannot reach the game server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    let id: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (id === null) id = setInterval(load, 5000);
    };

    const stop = () => {
      if (id === null) return;
      clearInterval(id);
      id = null;
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        load();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);

  function join(code: string) {
    socket?.emit('room:join', code, (res) => {
      if (!res.ok) setError(res.error);
    });
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Looking for rooms…</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-500">{error}</p>}

      {rooms.length === 0 && !error && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No open rooms right now. Make one and set it to public.
          </CardContent>
        </Card>
      )}

      {rooms.map((room) => (
        <Card key={room.code}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-mono text-sm font-semibold tracking-[0.2em]">{room.code}</p>
              <p className="text-xs text-muted-foreground">
                {room.hostName} · {room.rounds} rounds ·{' '}
                {room.secondsPerRound > 0 ? `${room.secondsPerRound}s` : 'untimed'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {room.players}/{room.maxPlayers}
              </span>
              <Button size="sm" variant="outline" onClick={() => join(room.code)}>
                Join
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
