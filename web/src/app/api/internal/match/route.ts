import { NextResponse } from 'next/server';
import { hasDatabase, recordMatch, type MatchInput } from '@/lib/db';
import { recordWord } from '@/lib/vocab';
import { grantAchievements } from '@/lib/db';

const secret = process.env.INTERNAL_API_SECRET;

export async function POST(request: Request) {
  if (!secret || request.headers.get('x-internal-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!hasDatabase) {
    return NextResponse.json({ error: 'no database configured' }, { status: 503 });
  }

  let body: MatchInput;
  try {
    body = (await request.json()) as MatchInput;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  if (!body?.matchId || !Array.isArray(body.players) || body.players.length === 0) {
    return NextResponse.json({ error: 'bad payload' }, { status: 400 });
  }

  const saved = await recordMatch({
    matchId: body.matchId,
    code: body.code ?? '',
    mode: body.mode === 'solo' || body.mode === 'daily' ? body.mode : 'race',
    day: typeof body.day === 'string' ? body.day : null,
    game:
      body.game === 'tictactoe' || body.game === 'anagram' ? body.game : 'wordbattle',
    players: body.players,
    winnerId: body.winnerId ?? null,
    rounds: Array.isArray(body.rounds) ? body.rounds : [],
  });

  if (!saved) return NextResponse.json({ error: 'save failed' }, { status: 500 });

  for (const round of body.rounds ?? []) {
    if (!round?.answer) continue;

    for (const board of round.boards ?? []) {
      if (!board?.playerId) continue;
      await recordWord(board.playerId, round.answer, Boolean(board.solved));
    }
  }

  for (const player of body.players ?? []) {
    if (player?.userId) await grantAchievements(player.userId);
  }

  return NextResponse.json({ ok: true });
}
