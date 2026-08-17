'use client';

import { useState } from 'react';
import { useSocket } from '@/lib/socket';
import { CONFIG_LIMITS, type RoomConfig } from '@/lib/protocol';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { GameView } from '@/components/game-view';
import { ChatBox } from '@/components/chat-box';

export function RoomPanel({ userId }: { userId: string }) {
  const socket = useSocket((s) => s.socket);
  const status = useSocket((s) => s.status);
  const room = useSocket((s) => s.room);
  const clearRoom = useSocket((s) => s.clearRoom);

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(false);

  const offline = status !== 'online' || !socket;

  function quickmatch() {
    if (!socket) return;
    setError('');

    socket.emit('room:quickmatch', (res) => {
      if (!res.ok) setError(res.error);
      else setQueued(res.data.waiting);
    });
  }

  function cancelQueue() {
    socket?.emit('room:cancelQuickmatch', () => setQueued(false));
  }

  function solo() {
    if (!socket) return;
    setBusy(true);
    setError('');
    socket.emit('room:solo', {}, (res) => {
      setBusy(false);
      if (!res.ok) setError(res.error);
    });
  }

  function create() {
    if (!socket) return;
    setBusy(true);
    setError('');
    socket.emit('room:create', {}, (res) => {
      setBusy(false);
      if (!res.ok) setError(res.error);
    });
  }

  function join() {
    if (!socket) return;
    const value = code.trim().toUpperCase();
    if (value.length < 4) {
      setError('enter a room code');
      return;
    }

    setBusy(true);
    setError('');
    socket.emit('room:join', value, (res) => {
      setBusy(false);
      if (!res.ok) setError(res.error);
      else setCode('');
    });
  }

  function leave() {
    if (!socket) return;
    socket.emit('room:leave', () => clearRoom());
  }

  function toggleReady(ready: boolean) {
    socket?.emit('room:ready', ready, () => undefined);
  }

  function updateConfig(patch: Partial<RoomConfig>) {
    socket?.emit('room:config', patch, (res) => {
      if (!res.ok) setError(res.error);
    });
  }

  if (!room) {
    return (
      <Card>
        <CardContent className="space-y-6 p-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Start a room</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Make one and share the code, or drop into a friend&apos;s.
            </p>
          </div>

          {queued ? (
            <div className="space-y-2 rounded-lg border border-border p-4 text-center">
              <p className="text-sm font-medium">Looking for an opponent…</p>
              <Button variant="ghost" size="sm" onClick={cancelQueue}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button onClick={quickmatch} disabled={offline} className="w-full">
              Quick match
            </Button>
          )}

          <Button onClick={create} variant="outline" disabled={offline || busy} className="w-full">
            Create room
          </Button>

          <Button
            onClick={solo}
            variant="outline"
            disabled={offline || busy}
            className="w-full"
          >
            Play solo
          </Button>

          <div className="flex items-center gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Room code"
              maxLength={5}
              className="uppercase tracking-[0.3em]"
            />
            <Button variant="outline" onClick={join} disabled={offline || busy}>
              Join
            </Button>
          </div>

          {offline && (
            <p className="text-sm text-muted-foreground">
              Waiting for the game server to come up.
            </p>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  if (room.phase !== 'lobby' && socket) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <GameView room={room} socket={socket} userId={userId} />
          </CardContent>
        </Card>

        {room.config.mode !== 'solo' && <ChatBox userId={userId} />}
      </div>
    );
  }

  const me = room.players.find((p) => p.profile.id === userId);
  const isHost = room.hostId === userId;

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Room code
            </p>
            <p className="font-mono text-2xl font-semibold tracking-[0.3em]">{room.code}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={leave}>
            Leave
          </Button>
        </div>

        <div className="space-y-2">
          {room.players.map((player) => (
            <div
              key={player.profile.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <span
                  className={
                    player.connected
                      ? 'h-2 w-2 rounded-full bg-emerald-500'
                      : 'h-2 w-2 rounded-full bg-muted-foreground'
                  }
                />
                {player.profile.name}
                {player.profile.id === room.hostId && (
                  <span className="text-xs text-muted-foreground">host</span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {player.ready ? 'ready' : 'waiting'}
                </span>

                {isHost && player.profile.id !== userId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      socket?.emit('room:remove', player.profile.id, (res) => {
                        if (!res.ok) setError(res.error);
                      })
                    }
                  >
                    Remove
                  </Button>
                )}
              </span>
            </div>
          ))}

          {Array.from({ length: Math.max(0, room.config.maxPlayers - room.players.length) }).map(
            (_, i) => (
              <div
                key={`seat-${i}`}
                className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground"
              >
                Empty seat
              </div>
            ),
          )}
        </div>

        {isHost && (
          <div className="grid gap-3 sm:grid-cols-5">
            <Setting
              label="Rounds"
              value={room.config.rounds}
              options={CONFIG_LIMITS.rounds}
              onChange={(rounds) => updateConfig({ rounds })}
            />
            <Setting
              label="Seconds"
              value={room.config.secondsPerRound}
              options={CONFIG_LIMITS.secondsPerRound}
              onChange={(secondsPerRound) => updateConfig({ secondsPerRound })}
            />
            <Setting
              label="Guesses"
              value={room.config.maxGuesses}
              options={CONFIG_LIMITS.maxGuesses}
              onChange={(maxGuesses) => updateConfig({ maxGuesses })}
            />
            <Setting
              label="Visibility"
              value={room.config.visibility === 'open' ? 1 : 0}
              options={[0, 1]}
              labels={{ 0: 'private', 1: 'public' }}
              onChange={(value) => updateConfig({ visibility: value === 1 ? 'open' : 'private' })}
            />
            <Setting
              label="Players"
              value={room.config.maxPlayers}
              options={CONFIG_LIMITS.maxPlayers}
              onChange={(maxPlayers) => updateConfig({ maxPlayers })}
            />
          </div>
        )}

        <Button
          className="w-full"
          variant={me?.ready ? 'outline' : 'default'}
          onClick={() => toggleReady(!me?.ready)}
        >
          {me?.ready ? 'Not ready' : 'Ready up'}
        </Button>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <ChatBox userId={userId} />
      </CardContent>
    </Card>
  );
}

function Setting({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: number;
  options: readonly number[];
  labels?: Record<number, string>;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] ?? (option === 0 ? 'off' : option)}
          </option>
        ))}
      </select>
    </label>
  );
}
