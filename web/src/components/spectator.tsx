'use client';

import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { useSocket } from '@/lib/socket';
import { gameMeta } from '@/components/games/registry';
import { MiniBoard } from '@/components/games/wordbattle/board';
import { TicTacToeBoard } from '@/components/games/tictactoe/board';
import { ChatBox } from '@/components/chat-box';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function Spectator({ code, userId }: { code: string; userId: string }) {
  const socket = useSocket((s) => s.socket);
  const status = useSocket((s) => s.status);
  const room = useSocket((s) => s.room);
  const clearRoom = useSocket((s) => s.clearRoom);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!socket || status !== 'online' || joined) return;

    socket.emit('room:watch', code, (res) => {
      if (res.ok) setJoined(true);
      else setError(res.error);
    });
  }, [socket, status, code, joined]);

  useEffect(() => {
    return () => {
      socket?.emit('room:unwatch', () => undefined);
    };
  }, [socket]);

  if (error) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <Button variant="outline" onClick={() => setError('')}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!room || !room.spectating) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Joining the room as a spectator…
        </CardContent>
      </Card>
    );
  }

  const meta = gameMeta(room.config.game);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-lg font-semibold tracking-[0.2em]">{room.code}</p>
              <p className="text-xs text-muted-foreground">
                {meta.name} · {room.phase === 'playing' ? `round ${room.round}` : room.phase}
              </p>
            </div>

            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              {room.watchers} watching
            </span>
          </div>

          {room.config.game === 'tictactoe' && room.ttt ? (
            <TicTacToeBoard
              board={room.ttt.board}
              marks={room.ttt.marks}
              winningLine={room.ttt.winningLine}
              lastMove={room.ttt.lastMove}
              disabled
              onPlay={() => undefined}
            />
          ) : room.config.game === 'anagram' && room.anagram ? (
            <div className="flex flex-wrap justify-center gap-2">
              {room.anagram.pool.map((letter, index) => (
                <span
                  key={index}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-border bg-card text-lg font-bold uppercase"
                >
                  {letter}
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {room.players.map((player) => (
              <div key={player.profile.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar id={player.profile.avatar} name={player.profile.name} size={26} />
                  <span className="text-sm font-medium">{player.profile.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{player.score}</span>
                </div>

                {room.config.game === 'wordbattle' && (
                  <MiniBoard guesses={player.maskedGuesses} rows={room.config.maxGuesses} />
                )}

                {room.config.game === 'anagram' && (
                  <p className="text-xs text-muted-foreground">
                    {room.anagram?.counts[player.profile.id] ?? 0} words
                  </p>
                )}

                {player.solved && <p className="text-xs text-emerald-500">solved</p>}
                {player.resigned && <p className="text-xs text-muted-foreground">passed</p>}
              </div>
            ))}
          </div>

          {room.answer && (
            <p className="text-center text-sm">
              The word was <span className="font-semibold uppercase">{room.answer}</span>
            </p>
          )}

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => socket?.emit('room:unwatch', () => clearRoom())}
          >
            Stop watching
          </Button>
        </CardContent>
      </Card>

      <ChatBox userId={userId} />
    </div>
  );
}
