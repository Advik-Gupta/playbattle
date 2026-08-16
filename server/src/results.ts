import type { Room } from './rooms.js';

export async function reportMatch(room: Room, matchId: string) {
  const webUrl = process.env.WEB_APP_URL ?? 'http://localhost:3000';
  const secret = process.env.INTERNAL_API_SECRET ?? '';

  if (!secret) {
    console.warn('INTERNAL_API_SECRET not set, match not saved');
    return;
  }

  const payload = {
    matchId,
    code: room.code,
    mode: room.config.mode,
    players: [...room.players.values()].map((player) => ({
      userId: player.profile.id,
      name: player.profile.name,
      score: player.score,
    })),
    winnerId: room.matchWinnerId,
    rounds: room.history.map((round) => ({
      round: round.round,
      answer: round.answer,
      winnerId: round.winnerId,
      boards: round.boards.map((board) => ({
        playerId: board.playerId,
        words: board.guesses.map((guess) => guess.word),
        solved: board.solved,
        solveMs: board.solveMs,
        hints: board.hints,
      })),
    })),
  };

  try {
    const res = await fetch(`${webUrl}/api/internal/match`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify(payload),
    });

    if (!res.ok) console.error('match report failed', res.status, await res.text());
  } catch (err) {
    console.error('match report failed', (err as Error).message);
  }
}
