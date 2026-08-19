import { BookOpen, Grid3x3, type LucideIcon } from 'lucide-react';
import type { GameId } from '@/lib/protocol';

export interface GameMeta {
  id: GameId;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  hasSolo: boolean;
  hasWords: boolean;
}

export const GAME_LIST: GameMeta[] = [
  {
    id: 'wordbattle',
    name: 'WordBattle',
    tagline: 'Guess the word before they do',
    description: 'Five letters, six guesses, and someone racing you to it.',
    icon: BookOpen,
    accent: 'from-emerald-500/20 to-transparent',
    hasSolo: true,
    hasWords: true,
  },
  {
    id: 'tictactoe',
    name: 'Tic Tac Toe',
    tagline: 'Three in a row, best of three',
    description: 'Quick rounds, swapping who goes first each time.',
    icon: Grid3x3,
    accent: 'from-sky-500/20 to-transparent',
    hasSolo: true,
    hasWords: false,
  },
];

export function gameMeta(id: GameId): GameMeta {
  return GAME_LIST.find((game) => game.id === id) ?? GAME_LIST[0];
}
