import { Trophy } from 'lucide-react';
import type { BracketMatch, TournamentState } from '@/lib/protocol';
import { Avatar } from '@/components/avatar';
import { cn } from '@/lib/utils';

function roundName(index: number, total: number) {
  const fromEnd = total - index;

  if (fromEnd === 1) return 'Final';
  if (fromEnd === 2) return 'Semi finals';
  if (fromEnd === 3) return 'Quarter finals';

  return `Round ${index + 1}`;
}

function Seat({
  seat,
  winner,
  userId,
}: {
  seat: BracketMatch['seats'][number];
  winner: boolean;
  userId: string;
}) {
  if (!seat) {
    return (
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground">
        <span className="h-6 w-6 rounded-full bg-muted" />
        bye
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
        winner ? 'bg-emerald-500/10 font-medium text-emerald-600' : '',
        seat.userId === userId && !winner ? 'font-medium text-primary' : '',
      )}
    >
      <Avatar id={seat.avatar} name={seat.name} size={24} />
      <span className="truncate">{seat.name}</span>
      {winner && <Trophy className="ml-auto h-3.5 w-3.5" />}
    </div>
  );
}

export function Bracket({ state, userId }: { state: TournamentState; userId: string }) {
  if (state.rounds.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        The bracket appears once the host starts it.
      </p>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {state.rounds.map((round, index) => (
        <div key={index} className="min-w-[200px] flex-1 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {roundName(index, state.rounds.length)}
          </p>

          {round.map((match) => (
            <div
              key={match.id}
              className={cn(
                'rounded-lg border p-2',
                match.roomCode && !match.done
                  ? 'border-primary/60 bg-primary/5'
                  : 'border-border bg-card',
              )}
            >
              <Seat
                seat={match.seats[0]}
                winner={Boolean(match.winnerId) && match.seats[0]?.userId === match.winnerId}
                userId={userId}
              />
              <div className="my-1 h-px bg-border" />
              <Seat
                seat={match.seats[1]}
                winner={Boolean(match.winnerId) && match.seats[1]?.userId === match.winnerId}
                userId={userId}
              />

              {match.roomCode && !match.done && (
                <p className="mt-1 px-2 text-[10px] uppercase tracking-wide text-primary">
                  playing
                </p>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
