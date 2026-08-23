'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TOURNAMENT_SIZES, type GameId } from '@/lib/protocol';
import { useSocket } from '@/lib/socket';
import { GAME_LIST } from '@/components/games/registry';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function TournamentStarter() {
  const socket = useSocket((s) => s.socket);
  const status = useSocket((s) => s.status);
  const router = useRouter();

  const [game, setGame] = useState<GameId>('wordbattle');
  const [size, setSize] = useState<number>(4);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const offline = status !== 'online' || !socket;

  function create() {
    socket?.emit('tournament:create', { game, size }, (res) => {
      if (res.ok) router.push(`/tournaments/${res.data.code}`);
      else setError(res.error);
    });
  }

  function join() {
    const wanted = code.trim().toUpperCase();
    if (wanted.length < 3) {
      setError('enter a code');
      return;
    }

    socket?.emit('tournament:join', wanted, (res) => {
      if (res.ok) router.push(`/tournaments/${res.data.code}`);
      else setError(res.error);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Game
          </p>
          <div className="flex flex-wrap gap-2">
            {GAME_LIST.map((entry) => (
              <Button
                key={entry.id}
                size="sm"
                variant={entry.id === game ? 'default' : 'outline'}
                onClick={() => setGame(entry.id)}
              >
                {entry.name}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Size
          </p>
          <div className="flex gap-2">
            {TOURNAMENT_SIZES.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={option === size ? 'default' : 'outline'}
                onClick={() => setSize(option)}
              >
                {option} players
              </Button>
            ))}
          </div>
        </div>

        <Button className="w-full" onClick={create} disabled={offline}>
          Create tournament
        </Button>

        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Code"
            maxLength={4}
            className="uppercase tracking-[0.3em]"
          />
          <Button variant="outline" onClick={join} disabled={offline}>
            Join
          </Button>
        </div>

        {offline && <p className="text-sm text-muted-foreground">Waiting for the game server.</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </CardContent>
    </Card>
  );
}
