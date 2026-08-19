import type { GameId, RoundSummary } from '../protocol.js';
import type { Room } from '../rooms.js';

export interface GameModule {
  id: GameId;
  startRound: (room: Room) => void;
  isRoundOver: (room: Room) => boolean;
  summarize: (room: Room) => RoundSummary;
  onPlayerGone?: (room: Room, userId: string) => void;
}
