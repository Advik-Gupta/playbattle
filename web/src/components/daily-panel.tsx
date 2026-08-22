'use client';

import { useEffect, useState } from 'react';
import { useSocket, type GameSocket } from '@/lib/socket';
import { scoreLocal } from '@/lib/score';
import { WordBattleView } from '@/components/games/wordbattle/game-view';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const SQUARES: Record<string, string> = {
  correct: '\u{1F7E9}',
  present: '\u{1F7E8}',
  absent: '\u{2B1C}',
};

export function shareGrid(day: string, words: string[], answer: string, solved: boolean) {
  const header = `playbattle daily ${day} ${solved ? words.length : 'X'}/6`;
  const rows = words.map((word) =>
    scoreLocal(word, answer)
      .map((tile) => SQUARES[tile])
      .join(''),
  );

  return [header, ...rows].join('\n');
}

export function DailyPanel({
  userId,
  day,
  alreadyPlayed,
  previous,
}: {
  userId: string;
  day: string;
  alreadyPlayed: boolean;
  previous: { words: string[]; answer: string; solved: boolean } | null;
}) {
  const socket = useSocket((s) => s.socket);
  const status = useSocket((s) => s.status);
  const room = useSocket((s) => s.room);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  const playing = room?.config.mode === 'daily';
  const finished = playing && room.phase === 'match_over';

  useEffect(() => {
    if (!finished || !room?.answer) return;

    const me = room.players.find((player) => player.profile.id === userId);
    if (!me?.guesses) return;
  }, [finished, room, userId]);

  function start() {
    if (!socket) return;

    setStarting(true);
    setError('');

    socket.emit('room:daily', (res) => {
      setStarting(false);
      if (!res.ok) setError(res.error);
    });
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('could not copy');
    }
  }

  if (playing && socket) {
    const me = room.players.find((player) => player.profile.id === userId);
    const grid =
      finished && room.answer && me?.guesses
        ? shareGrid(day, me.guesses.map((guess) => guess.word), room.answer, Boolean(me.solved))
        : null;

    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <WordBattleView room={room} socket={socket as GameSocket} userId={userId} />
          </CardContent>
        </Card>

        {grid && (
          <Card>
            <CardContent className="space-y-3 p-6">
              <pre className="whitespace-pre text-center text-lg leading-tight">{grid}</pre>
              <Button className="w-full" onClick={() => copy(grid)}>
                {copied ? 'Copied' : 'Copy result'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (alreadyPlayed && previous) {
    const grid = shareGrid(day, previous.words, previous.answer, previous.solved);

    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <p className="text-sm font-medium">
            {previous.solved
              ? `Solved in ${previous.words.length}`
              : `Missed it. The word was ${previous.answer.toUpperCase()}`}
          </p>

          <pre className="whitespace-pre text-center text-lg leading-tight">{grid}</pre>

          <Button variant="outline" className="w-full" onClick={() => copy(grid)}>
            {copied ? 'Copied' : 'Copy result'}
          </Button>

          <p className="text-xs text-muted-foreground">Come back tomorrow for a new word.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6 text-center">
        <div>
          <p className="text-sm font-medium">One word, one try, same for everyone</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No hints, no timer. Your streak carries as long as you keep solving.
          </p>
        </div>

        <Button
          className="w-full"
          onClick={start}
          disabled={status !== 'online' || starting}
        >
          Play today&apos;s word
        </Button>

        {status !== 'online' && (
          <p className="text-sm text-muted-foreground">Waiting for the game server.</p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </CardContent>
    </Card>
  );
}
