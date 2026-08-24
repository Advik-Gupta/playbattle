'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_HINTS, WORD_LENGTH, type RoomState } from '@/lib/protocol';
import { useSocket, type GameSocket } from '@/lib/socket';
import { Board, MiniBoard } from '@/components/games/wordbattle/board';
import { Keyboard } from '@/components/games/wordbattle/keyboard';
import { Button } from '@/components/ui/button';
import { Confetti } from '@/components/confetti';
import { play } from '@/lib/sound';
import { DefinitionCard } from '@/components/definition-card';

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

export function WordBattleView({
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
  const [pulsing, setPulsing] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const clearRoom = useSocket((s) => s.clearRoom);

  const me = room.players.find((p) => p.profile.id === userId);
  const others = room.players.filter((p) => p.profile.id !== userId);
  const locked = room.phase !== 'playing' || Boolean(me?.solved) || Boolean(me?.outOfGuesses);
  const seconds = useCountdown(room.deadline, room.now);
  const isSolo = room.config.mode === 'solo';
  const hintsLeft = MAX_HINTS - (me?.hints?.length ?? 0);

  useEffect(() => {
    setDraft('');
    setError('');
  }, [room.round, room.phase]);

  useEffect(() => {
    const onGuess = (playerId: string) => {
      setPulsing(playerId);
      setTimeout(() => setPulsing((current) => (current === playerId ? null : current)), 700);
    };

    socket.on('game:opponentGuessed', onGuess);
    return () => {
      socket.off('game:opponentGuessed', onGuess);
    };
  }, [socket]);

  const send = useCallback(() => {
    if (draft.length !== WORD_LENGTH) {
      setError('needs five letters');
      setShaking(true);
      setTimeout(() => setShaking(false), 450);
      return;
    }

    socket.emit('game:guess', draft, (res) => {
      if (res.ok) {
        setDraft('');
        setError('');
        play('submit');
        return;
      }

      setError(res.error);
      play('wrong');
      setShaking(true);
      setTimeout(() => setShaking(false), 450);
    });
  }, [draft, socket]);

  const type = useCallback(
    (letter: string) => {
      setError('');
        play('key');
      setDraft((current) => (current.length >= WORD_LENGTH ? current : current + letter));
    },
    [],
  );

  const back = useCallback(() => setDraft((current) => current.slice(0, -1)), []);

  const celebrating = room.phase === 'match_over' && room.matchWinnerId === userId;

  useEffect(() => {
    if (room.phase !== 'match_over') return;
    play(room.matchWinnerId === userId ? 'win' : 'lose');
  }, [room.phase, room.matchWinnerId, userId]);

  return (
    <div className="space-y-6">
      <Confetti active={celebrating} />
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {isSolo ? 'Solo' : `Round ${room.round} of ${room.config.rounds}`}
        </span>
        {seconds !== null && (
          <span className="font-mono tabular-nums text-muted-foreground">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="mx-auto w-full max-w-[300px] sm:mx-0">
          <Board
            guesses={me?.guesses ?? []}
            draft={locked ? '' : draft}
            rows={room.config.maxGuesses}
            shaking={shaking}
          />
        </div>

        <div className="flex-1 space-y-4">
          {isSolo && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {(me?.hints ?? []).map((hint) => (
                  <span
                    key={hint.index}
                    className="rounded-md bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-600"
                  >
                    letter {hint.index + 1} is {hint.letter.toUpperCase()}
                  </span>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={locked || hintsLeft <= 0}
                onClick={() =>
                  socket.emit('game:hint', (res) => {
                    if (!res.ok) setError(res.error);
                  })
                }
              >
                {hintsLeft > 0 ? `Hint (${hintsLeft} left)` : 'No hints left'}
              </Button>

              <p className="text-xs text-muted-foreground">
                Hints break your streak for this word.
              </p>
            </div>
          )}

          {others.map((player) => (
            <div
              key={player.profile.id}
              className={`space-y-1.5 rounded-lg p-2 transition-colors duration-300 ${
                pulsing === player.profile.id ? 'bg-accent' : ''
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{player.profile.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{player.score}</span>
                  {room.players.length > 2 && room.phase === 'playing' && (
                    <button
                      type="button"
                      onClick={() =>
                        socket.emit('room:votekick', player.profile.id, (res) => {
                          if (!res.ok) setError(res.error);
                        })
                      }
                      className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                    >
                      kick
                    </button>
                  )}
                </span>
              </div>
              <MiniBoard guesses={player.maskedGuesses} rows={room.config.maxGuesses} />
              {player.resigned && <p className="text-xs text-muted-foreground">skipped</p>}
              {player.solved && (
                <p className="text-xs text-emerald-500">solved in {player.guesses?.length ?? 0}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {room.votekicks.length > 0 && (
        <div className="space-y-1.5">
          {room.votekicks.map((vote) => (
            <div
              key={vote.targetId}
              className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm"
            >
              <span>
                Vote to remove {vote.targetName} ({vote.votes.length}/{vote.required})
              </span>
              {!vote.votes.includes(userId) && vote.targetId !== userId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    socket.emit('room:votekick', vote.targetId, (res) => {
                      if (!res.ok) setError(res.error);
                    })
                  }
                >
                  Vote
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {room.answer && (
        <div className="space-y-3">
          <p className="text-center text-sm">
            The word was <span className="font-semibold uppercase">{room.answer}</span>
          </p>
          <DefinitionCard word={room.answer} />
        </div>
      )}

      {error && <p className="text-center text-sm text-red-500">{error}</p>}

      {room.phase === 'match_over' ? (
        <div className="cheer space-y-3 text-center">
          <p className="text-lg font-semibold">
            {isSolo
              ? me?.solved
                ? 'Solved it'
                : 'Better luck next word'
              : room.matchWinnerId === null
                ? 'Draw'
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
                {isSolo ? 'New word' : 'Rematch'}
              </Button>
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
        <div className="space-y-3">
          <Keyboard
            keyboard={me?.keyboard ?? {}}
            onKey={type}
            onEnter={send}
            onBackspace={back}
            disabled={locked}
          />

          {!isSolo && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={locked}
              onClick={() =>
                socket.emit('game:skip', (res) => {
                  if (!res.ok) setError(res.error);
                })
              }
            >
              Skip this word
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
