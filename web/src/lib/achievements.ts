import type { Profile } from '@/lib/db';

export type AchievementTier = 'bronze' | 'silver' | 'gold';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  tier: AchievementTier;
  target: number;
  progress: (profile: Profile, words: number) => number;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-win',
    name: 'Off the mark',
    description: 'Win your first match',
    tier: 'bronze',
    target: 1,
    progress: (p) => p.stats.won,
  },
  {
    id: 'ten-wins',
    name: 'Getting good',
    description: 'Win ten matches',
    tier: 'silver',
    target: 10,
    progress: (p) => p.stats.won,
  },
  {
    id: 'fifty-wins',
    name: 'Regular',
    description: 'Win fifty matches',
    tier: 'gold',
    target: 50,
    progress: (p) => p.stats.won,
  },
  {
    id: 'hundred-matches',
    name: 'Century',
    description: 'Play a hundred matches',
    tier: 'silver',
    target: 100,
    progress: (p) => p.stats.played,
  },
  {
    id: 'streak-three',
    name: 'On a roll',
    description: 'Win three in a row',
    tier: 'bronze',
    target: 3,
    progress: (p) => p.stats.bestStreak,
  },
  {
    id: 'streak-five',
    name: 'Hot hand',
    description: 'Win five in a row',
    tier: 'silver',
    target: 5,
    progress: (p) => p.stats.bestStreak,
  },
  {
    id: 'streak-ten',
    name: 'Unstoppable',
    description: 'Win ten in a row',
    tier: 'gold',
    target: 10,
    progress: (p) => p.stats.bestStreak,
  },
  {
    id: 'thousand-points',
    name: 'Four figures',
    description: 'Bank a thousand points',
    tier: 'bronze',
    target: 1000,
    progress: (p) => p.stats.points,
  },
  {
    id: 'five-thousand-points',
    name: 'Point machine',
    description: 'Bank five thousand points',
    tier: 'gold',
    target: 5000,
    progress: (p) => p.stats.points,
  },
  {
    id: 'solo-streak-five',
    name: 'Practice makes perfect',
    description: 'Solve five solo words in a row',
    tier: 'bronze',
    target: 5,
    progress: (p) => p.solo.bestStreak,
  },
  {
    id: 'solo-streak-ten',
    name: 'Word machine',
    description: 'Solve ten solo words in a row',
    tier: 'silver',
    target: 10,
    progress: (p) => p.solo.bestStreak,
  },
  {
    id: 'daily-three',
    name: 'Habit forming',
    description: 'Keep a three day daily streak',
    tier: 'bronze',
    target: 3,
    progress: (p) => p.daily.bestStreak,
  },
  {
    id: 'daily-seven',
    name: 'Full week',
    description: 'Keep a seven day daily streak',
    tier: 'silver',
    target: 7,
    progress: (p) => p.daily.bestStreak,
  },
  {
    id: 'daily-thirty',
    name: 'Every single day',
    description: 'Keep a thirty day daily streak',
    tier: 'gold',
    target: 30,
    progress: (p) => p.daily.bestStreak,
  },
  {
    id: 'all-rounder',
    name: 'All rounder',
    description: 'Play every game at least once',
    tier: 'silver',
    target: 3,
    progress: (p) =>
      (['wordbattle', 'tictactoe', 'anagram'] as const).filter(
        (game) => (p.games?.[game]?.played ?? 0) > 0,
      ).length,
  },
  {
    id: 'noughts-five',
    name: 'Three in a row',
    description: 'Win five games of tic tac toe',
    tier: 'bronze',
    target: 5,
    progress: (p) => p.games?.tictactoe?.won ?? 0,
  },
  {
    id: 'anagram-five',
    name: 'Letter sorter',
    description: 'Win five games of anagram rush',
    tier: 'bronze',
    target: 5,
    progress: (p) => p.games?.anagram?.won ?? 0,
  },
  {
    id: 'words-fifty',
    name: 'Collector',
    description: 'Meet fifty different words',
    tier: 'bronze',
    target: 50,
    progress: (_p, words) => words,
  },
  {
    id: 'words-two-fifty',
    name: 'Lexicon',
    description: 'Meet two hundred and fifty different words',
    tier: 'gold',
    target: 250,
    progress: (_p, words) => words,
  },
];

export function allAchievements() {
  return ACHIEVEMENTS;
}

export function achievementById(id: string) {
  return ACHIEVEMENTS.find((entry) => entry.id === id) ?? null;
}

export interface AchievementView extends Achievement {
  earned: boolean;
  current: number;
  at: string | null;
}

export function describe(
  profile: Profile,
  words: number,
  earned: { id: string; at: string }[],
): AchievementView[] {
  const byId = new Map(earned.map((entry) => [entry.id, entry.at]));

  return ACHIEVEMENTS.map((entry) => {
    const current = Math.max(0, entry.progress(profile, words));

    return {
      ...entry,
      current: Math.min(current, entry.target),
      earned: byId.has(entry.id) || current >= entry.target,
      at: byId.get(entry.id) ?? null,
    };
  });
}

export function newlyEarned(
  profile: Profile,
  words: number,
  already: string[],
): string[] {
  const have = new Set(already);

  return ACHIEVEMENTS.filter(
    (entry) => !have.has(entry.id) && entry.progress(profile, words) >= entry.target,
  ).map((entry) => entry.id);
}
