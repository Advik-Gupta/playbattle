'use client';

import { useCallback, useEffect, useState } from 'react';
import { WORD_LENGTH, type RoomState } from '@/lib/protocol';
import { useSocket, type GameSocket } from '@/lib/socket';
import { Board, MiniBoard } from '@/components/board';
import { Keyboard } from '@/components/keyboard';
import { Button } from '@/components/ui/button';

function useCountdown(deadline: number | null, offset: number) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (deadline === null) {
      setLeft(null);
      return;
    }

    const tick = () => setLeft(Math.max(0, Math.round((deadline - Date.now() - offset) / 1000)));
    tick();

    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [deadline, offset]);

  return left;
}

export function GameView({
  room,
  socket,
  userId,
}: {
  room: RoomState;
  socket: GameSocket;
  userId: string;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const clearRoom = useSocket((s) => s.clearRoom);

  const me = room.players.find((p) => p.profile.id === userId);
  const others = room.players.filter((p) => p.profile.id !== userId);
  const locked = room.phase !== 'playing' || Boolean(me?.solved) || Boolean(me?.outOfGuesses);
  const seconds = useCountdown(room.deadline, room.now - Date.now());

  useEffect(() => {
    setDraft('');
    setError('');
  }, [room.round, room.phase]);

  const send = useCallback(() => {
    if (draft.length !== WORD_LENGTH) {
      setError('needs five letters');
      return;
    }

    socket.emit('game:guess', draft, (res) => {
      if (res.ok) {
        setDraft('');
        setError('');
      } else {
        setError(res.error);
      }
    });
  }, [draft, socket]);

  const type = useCallback(
    (letter: string) => {
      setError('');
      setDraft((current) => (current.length >= WORD_LENGTH ? current : current + letter));
    },
    [],
  );

  const back = useCallback(() => setDraft((current) => current.slice(0, -1)), []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          Round {room.round} of {room.config.rounds}
        </span>
        {seconds !== null && (
          <span className="font-mono tabular-nums text-muted-foreground">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </span>
        )}
      </div>

      <div className="flex gap-6">
        <div className="w-full max-w-[320px]">
          <Board
            guesses={me?.guesses ?? []}
            draft={locked ? '' : draft}
            rows={room.config.maxGuesses}
          />
        </div>

        <div className="flex-1 space-y-4">
          {others.map((player) => (
            <div key={player.profile.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{player.profile.name}</span>
                <span className="text-xs text-muted-foreground">{player.score}</span>
              </div>
              <MiniBoard guesses={player.maskedGuesses} rows={room.config.maxGuesses} />
              {player.solved && (
                <p className="text-xs text-emerald-500">solved in {player.guesses?.length ?? 0}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {room.answer && (
        <p className="text-center text-sm">
          The word was <span className="font-semibold uppercase">{room.answer}</span>
        </p>
      )}

      {error && <p className="text-center text-sm text-red-500">{error}</p>}

      {room.phase === 'match_over' ? (
        <div className="space-y-3 text-center">
          <p className="text-lg font-semibold">
            {room.matchWinnerId === null
              ? 'Draw'
              : room.matchWinnerId === userId
                ? 'You win'
                : `${room.players.find((p) => p.profile.id === room.matchWinnerId)?.profile.name} wins`}
          </p>
          <div className="flex justify-center gap-2">
            {room.hostId === userId && (
              <Button onClick={() => socket.emit('room:rematch', () => undefined)}>Rematch</Button>
            )}
            <Button
              variant="outline"
              onClick={() => socket.emit('room:leave', () => clearRoom())}
            >
              Leave
            </Button>
          </div>
        </div>
      ) : (
        <Keyboard
          keyboard={me?.keyboard ?? {}}
          onKey={type}
          onEnter={send}
          onBackspace={back}
          disabled={locked}
        />
      )}
    </div>
  );
}
