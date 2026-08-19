import { CPU_ID, type RoundSummary, type TicTacToeState } from '../protocol.js';
import type { Room } from '../rooms.js';
import type { GameModule } from './types.js';

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function winnerOf(board: (string | null)[]) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { playerId: board[a] as string, line };
    }
  }

  return null;
}

export function boardFull(board: (string | null)[]) {
  return board.every((cell) => cell !== null);
}

export function seatIds(room: Room) {
  const ids = [...room.players.keys()];
  if (room.config.mode === 'solo' && ids.length === 1) ids.push(CPU_ID);
  return ids;
}

export function opponentOf(room: Room, userId: string) {
  return seatIds(room).find((id) => id !== userId) ?? null;
}

function emptyState(room: Room): TicTacToeState {
  const ids = seatIds(room);
  const first = room.round % 2 === 1 ? ids[0] : ids[1];
  const marks: Record<string, 'X' | 'O'> = {};

  ids.forEach((id, index) => {
    marks[id] = (index === 0 ? 'X' : 'O') as 'X' | 'O';
  });

  if (room.round % 2 === 0) {
    ids.forEach((id, index) => {
      marks[id] = (index === 0 ? 'O' : 'X') as 'X' | 'O';
    });
  }

  return {
    board: new Array(9).fill(null),
    marks,
    turnId: first ?? null,
    winningLine: null,
    lastMove: null,
  };
}

export function applyMove(room: Room, userId: string, index: number) {
  const state = room.ttt;
  if (!state) return { ok: false, error: 'no board' } as const;
  if (state.winningLine) return { ok: false, error: 'round already decided' } as const;
  if (state.turnId !== userId) return { ok: false, error: 'not your turn' } as const;
  if (!Number.isInteger(index) || index < 0 || index > 8) {
    return { ok: false, error: 'bad square' } as const;
  }
  if (state.board[index] !== null) return { ok: false, error: 'square is taken' } as const;

  state.board[index] = userId;
  state.lastMove = index;

  const won = winnerOf(state.board);
  if (won) {
    state.winningLine = won.line;
    state.turnId = null;
    return { ok: true, decided: true } as const;
  }

  if (boardFull(state.board)) {
    state.turnId = null;
    return { ok: true, decided: true } as const;
  }

  state.turnId = opponentOf(room, userId);
  return { ok: true, decided: false } as const;
}

function openSquares(board: (string | null)[]) {
  return board.map((cell, index) => (cell === null ? index : -1)).filter((index) => index >= 0);
}

function findWinning(board: (string | null)[], playerId: string) {
  for (const index of openSquares(board)) {
    const copy = [...board];
    copy[index] = playerId;
    if (winnerOf(copy)?.playerId === playerId) return index;
  }

  return null;
}

export function cpuMove(room: Room): number | null {
  const state = room.ttt;
  if (!state || state.turnId !== CPU_ID) return null;

  const human = opponentOf(room, CPU_ID);
  const open = openSquares(state.board);
  if (open.length === 0) return null;

  const win = findWinning(state.board, CPU_ID);
  if (win !== null) return win;

  const block = human ? findWinning(state.board, human) : null;
  if (block !== null) return block;

  if (state.board[4] === null) return 4;

  const corners = [0, 2, 6, 8].filter((index) => state.board[index] === null);
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];

  return open[Math.floor(Math.random() * open.length)];
}

export const tictactoe: GameModule = {
  id: 'tictactoe',

  startRound(room) {
    room.answer = null;
    room.ttt = emptyState(room);
  },

  isRoundOver(room) {
    const state = room.ttt;
    if (!state) return false;

    return Boolean(state.winningLine) || boardFull(state.board);
  },

  summarize(room): RoundSummary {
    const state = room.ttt;
    const won = state ? winnerOf(state.board) : null;

    return {
      round: room.round,
      answer: '',
      winnerId: won?.playerId ?? null,
      draw: !won,
      boards: [...room.players.values()].map((player) => ({
        playerId: player.profile.id,
        guesses: [],
        solved: won?.playerId === player.profile.id,
        solveMs: null,
        hints: 0,
      })),
      ttt: { board: state?.board ?? new Array(9).fill(null), line: state?.winningLine ?? null },
    };
  },

  onPlayerGone(room, userId) {
    const state = room.ttt;
    if (!state || state.turnId !== userId) return;

    state.turnId = opponentOf(room, userId);
  },
};

export function pointsForRound(won: boolean, draw: boolean) {
  if (won) return 100;
  return draw ? 40 : 0;
}
