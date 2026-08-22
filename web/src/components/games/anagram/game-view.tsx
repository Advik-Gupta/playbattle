'use client';

import { useEffect, useRef, useState } from 'react';
import { ANAGRAM_MIN_LENGTH, type RoomState } from '@/lib/protocol';
import { useSocket, type GameSocket } from '@/lib/socket';
import { Confetti } from '@/components/confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function useCountdown(deadline: number | null, serverNow: number) {
  const [left, setLeft] = useState<number | null>(null);
  const offset = useRef(0);

  useEffect(() => {
    offset.current = serverNow - Date.now();
  }, [serverNow]);

  useEffect(() => {
    if (deadline === null) {
      setLeft(null);
      return;
    }

    const tick = () =>
      setLeft(Math.max(0, Math.round((deadline - Date.now() - offset.current) / 1000)));

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline]);

  return left;
}

export function AnagramView({
  room,
  socket,
  userId,
}: {
  room: RoomState;
  socket: GameSocket;
  userId: string;
}) {
  const clearRoom = useSocket((s) => s.clearRoom);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [order, setOrder] = useState<number[]>([]);

  const state = room.anagram;
  const seconds = useCountdown(room.deadline, room.now);
  const me = room.players.find((player) => player.profile.id === userId);
  const isSolo = room.config.mode === 'solo';
  const playing = room.phase === 'playing' && !me?.resigned;

  useEffect(() => {
    setDraft('');
    setError('');
    setFlash('');
    setOrder(state ? state.pool.map((_, index) => index) : []);
  }, [room.round, room.phase, state?.pool.join('')]);

  const found = state?.found ?? [];
  const points = found.reduce((total, entry) => total + entry.points, 0);

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const word = draft.trim().toLowerCase();
    if (word.length < ANAGRAM_MIN_LENGTH) {
      setError(`at least ${ANAGRAM_MIN_LENGTH} letters`);
      return;
    }

    socket.emit('game:word', word, (res) => {
      if (res.ok) {
        setDraft('');
        setError('');
        setFlash(`+${res.data.points} ${res.data.word}`);
        setTimeout(() => setFlash(''), 1200);
      } else {
        setError(res.error);
      }
    });
  }

  function shuffle() {
    setOrder((current) => [...current].sort(() => Math.random() - 0.5));
  }

  const celebrating = room.phase === 'match_over' && room.matchWinnerId === userId;

  return (
    <div className="space-y-5">
      <Confetti active={celebrating} />

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          Round {room.round} of {room.config.rounds}
        </span>
        {seconds !== null && room.phase === 'playing' && (
          <span
            className={cn(
              'font-mono tabular-nums',
              seconds <= 10 ? 'text-red-500' : 'text-muted-foreground',
            )}
          >
            {seconds}s
          </span>
        )}
      </div>

      {state && (
        <div className="flex flex-wrap justify-center gap-2">
          {order.map((index) => (
            <span
              key={index}
              className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-border bg-card text-xl font-bold uppercase"
            >
              {state.pool[index]}
            </span>
          ))}
        </div>
      )}

      {playing && (
        <form onSubmit={submit} className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^a-zA-Z]/g, ''))}
            placeholder="Make a word"
            autoComplete="off"
            autoCapitalize="off"
            maxLength={7}
            className="uppercase"
          />
          <Button type="submit">Play</Button>
          <Button type="button" variant="outline" onClick={shuffle}>
            Mix
          </Button>
        </form>
      )}

      {flash && <p className="text-center text-sm font-medium text-emerald-500">{flash}</p>}
      {error && <p className="text-center text-sm text-red-500">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Your words · {points} points
          </p>

          {found.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {[...found].reverse().map((entry) => (
                <span
                  key={entry.word}
                  className="rounded-md bg-accent px-2 py-1 text-xs font-medium uppercase"
                >
                  {entry.word}
                  <span className="ml-1 text-muted-foreground">{entry.points}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Table
          </p>

          <div className="space-y-1.5">
            {room.players.map((player) => (
              <div key={player.profile.id} className="flex items-center justify-between text-sm">
                <span className={player.profile.id === userId ? 'font-medium text-primary' : ''}>
                  {player.profile.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {state?.counts[player.profile.id] ?? 0} words · {player.score}
                </span>
              </div>
            ))}
          </div>

          {state && state.best > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {state.best} points were on the table.
            </p>
          )}
        </div>
      </div>

      {playing && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() =>
            socket.emit('game:skip', (res) => {
              if (!res.ok) setError(res.error);
            })
          }
        >
          {isSolo ? 'End round' : 'Pass'}
        </Button>
      )}

      {room.phase === 'match_over' && (
        <div className="cheer space-y-3 text-center">
          <p className="text-lg font-semibold">
            {room.matchDraw
              ? 'Match drawn'
              : room.matchWinnerId === userId
                ? 'You win'
                : `${room.players.find((p) => p.profile.id === room.matchWinnerId)?.profile.name} wins`}
          </p>

          <div className="flex justify-center gap-2">
            {room.hostId === userId && (
              <Button
                onClick={() =>
                  socket.emit('room:rematch', (res) => {
                    if (!res.ok) setError(res.error);
                    else if (isSolo) socket.emit('room:ready', true, () => undefined);
                  })
                }
              >
                {isSolo ? 'Play again' : 'Rematch'}
              </Button>
            )}
            <Button variant="outline" onClick={() => socket.emit('room:leave', () => clearRoom())}>
              Leave
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
