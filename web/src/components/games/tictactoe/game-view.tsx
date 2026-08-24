'use client';

import { useEffect, useRef, useState } from 'react';
import { CPU_ID, type RoomState } from '@/lib/protocol';
import { useSocket, type GameSocket } from '@/lib/socket';
import { TicTacToeBoard } from '@/components/games/tictactoe/board';
import { Button } from '@/components/ui/button';
import { Confetti } from '@/components/confetti';
import { play as playSound } from '@/lib/sound';

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
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [deadline]);

  return left;
}

export function TicTacToeView({
  room,
  socket,
  userId,
}: {
  room: RoomState;
  socket: GameSocket;
  userId: string;
}) {
  const [error, setError] = useState('');
  const clearRoom = useSocket((s) => s.clearRoom);
  const seconds = useCountdown(room.deadline, room.now);

  const state = room.ttt;
  const isSolo = room.config.mode === 'solo';
  const myTurn = state?.turnId === userId && room.phase === 'playing';

  useEffect(() => {
    setError('');
  }, [room.round, room.phase]);

  function nameFor(playerId: string | null) {
    if (!playerId) return 'nobody';
    if (playerId === CPU_ID) return 'Computer';
    if (playerId === userId) return 'You';

    return room.players.find((player) => player.profile.id === playerId)?.profile.name ?? 'them';
  }

  function play(index: number) {
    socket.emit('game:move', index, (res) => {
      if (res.ok) playSound('submit');
      else {
        setError(res.error);
        playSound('wrong');
      }
    });
  }

  const last = room.history[room.history.length - 1];
  const showResult = room.phase === 'round_over' || room.phase === 'match_over';

  const celebrating = room.phase === 'match_over' && room.matchWinnerId === userId;

  useEffect(() => {
    if (room.phase !== 'match_over') return;
    playSound(room.matchWinnerId === userId ? 'win' : 'lose');
  }, [room.phase, room.matchWinnerId, userId]);

  return (
    <div className="space-y-5">
      <Confetti active={celebrating} />
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          Round {room.round} of {room.config.rounds}
        </span>
        {seconds !== null && room.phase === 'playing' && (
          <span className="font-mono tabular-nums text-muted-foreground">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </span>
        )}
      </div>

      <div className="flex items-center justify-center gap-6 text-sm">
        {(isSolo ? [userId, CPU_ID] : room.players.map((player) => player.profile.id)).map((id) => (
          <div key={id} className="text-center">
            <p className="text-2xl font-bold">{state?.marks[id] ?? '-'}</p>
            <p className="font-medium">{nameFor(id)}</p>
            <p className="text-xs text-muted-foreground">
              {room.history.filter((round) => round.winnerId === id).length} won
            </p>
          </div>
        ))}
      </div>

      {state && (
        <TicTacToeBoard
          board={state.board}
          marks={state.marks}
          winningLine={state.winningLine}
          lastMove={state.lastMove}
          disabled={!myTurn}
          onPlay={play}
        />
      )}

      {room.phase === 'playing' && (
        <p className="text-center text-sm text-muted-foreground">
          {myTurn ? 'Your move' : `Waiting on ${nameFor(state?.turnId ?? null)}`}
        </p>
      )}

      {showResult && last && (
        <p className="text-center text-sm">
          {last.draw ? 'Round drawn' : `${nameFor(last.winnerId)} took that round`}
        </p>
      )}

      {error && <p className="text-center text-sm text-red-500">{error}</p>}

      {room.phase === 'match_over' && (
        <div className="cheer space-y-3 text-center">
          <p className="text-lg font-semibold">
            {room.matchDraw
              ? 'Match drawn'
              : room.matchWinnerId === userId
                ? 'You win the match'
                : `${nameFor(room.matchWinnerId)} wins the match`}
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
