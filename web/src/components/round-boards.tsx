import type { MatchRound } from '@/lib/db';
import { scoreLocal } from '@/lib/score';
import { cn } from '@/lib/utils';

const TILE: Record<string, string> = {
  correct: 'bg-emerald-500 text-white',
  present: 'bg-amber-500 text-white',
  absent: 'bg-muted text-muted-foreground',
};

export function RoundBoards({
  round,
  players,
  userId,
}: {
  round: MatchRound;
  players: { userId: string; name: string }[];
  userId: string;
}) {
  if (round.ttt) {
    return (
      <div className="mx-auto grid w-full max-w-[180px] grid-cols-3 gap-1">
        {round.ttt.board.map((owner, index) => {
          const player = players.find((entry) => entry.userId === owner);
          const winning = round.ttt?.line?.includes(index) ?? false;

          return (
            <div
              key={index}
              className={cn(
                'flex aspect-square items-center justify-center rounded-md border text-sm font-bold uppercase',
                winning ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600' : 'border-border',
              )}
            >
              {player ? player.name.slice(0, 1) : owner === 'cpu' ? 'C' : ''}
            </div>
          );
        })}
      </div>
    );
  }

  if (round.boards.length === 0) {
    return <p className="text-sm text-muted-foreground">No boards recorded.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {round.boards.map((board) => {
        const player = players.find((entry) => entry.userId === board.playerId);

        return (
          <div key={board.playerId} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className={board.playerId === userId ? 'font-medium text-primary' : 'font-medium'}>
                {player?.name ?? 'player'}
              </span>
              <span className="text-muted-foreground">
                {board.solved
                  ? `solved in ${board.words.length}${board.hints ? ` · ${board.hints} hints` : ''}`
                  : 'missed'}
              </span>
            </div>

            <div className="space-y-1">
              {board.words.map((word, index) => (
                <div key={index} className="flex gap-1">
                  {scoreLocal(word, round.answer).map((tile, position) => (
                    <span
                      key={position}
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded text-[11px] font-semibold uppercase',
                        TILE[tile],
                      )}
                    >
                      {word[position]}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
