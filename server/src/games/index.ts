import type { GameId } from '../protocol.js';
import { anagram } from './anagram.js';
import { tictactoe } from './tictactoe.js';
import type { GameModule } from './types.js';
import { wordbattle } from './wordbattle.js';

const registry: Record<GameId, GameModule> = {
  wordbattle,
  tictactoe,
  anagram,
};

export function gameFor(id: GameId): GameModule {
  return registry[id] ?? wordbattle;
}

export const gameIds = Object.keys(registry) as GameId[];
