'use client';

import type { RoomState } from '@/lib/protocol';
import type { GameSocket } from '@/lib/socket';
import { TicTacToeView } from '@/components/games/tictactoe/game-view';
import { WordBattleView } from '@/components/games/wordbattle/game-view';

export function GameView({
  room,
  socket,
  userId,
}: {
  room: RoomState;
  socket: GameSocket;
  userId: string;
}) {
  if (room.config.game === 'tictactoe') {
    return <TicTacToeView room={room} socket={socket} userId={userId} />;
  }

  return <WordBattleView room={room} socket={socket} userId={userId} />;
}
