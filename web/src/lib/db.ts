import { cache } from 'react';
import mongoose, { Schema, type Model } from 'mongoose';

const uri = process.env.MONGODB_URI?.trim();

export const hasDatabase = Boolean(uri);

export interface Stats {
  played: number;
  won: number;
  rounds: number;
  roundsWon: number;
  solves: number;
  guesses: number;
  streak: number;
  bestStreak: number;
  points: number;
}

export const EMPTY_STATS: Stats = {
  played: 0,
  won: 0,
  rounds: 0,
  roundsWon: 0,
  solves: 0,
  guesses: 0,
  streak: 0,
  bestStreak: 0,
  points: 0,
};

export type SanctionKind = 'warn' | 'ban';

export interface SanctionRecord {
  _id?: unknown;
  userId: string;
  kind: SanctionKind;
  reason: string;
  actor: string;
  until: string | null;
  acknowledged: boolean;
  liftedAt: string | null;
  createdAt?: string;
}

export interface FriendLink {
  fromId: string;
  toId: string;
  status: 'pending' | 'accepted';
}

export interface PlayerCard {
  userId: string;
  displayName: string;
  avatar: string;
  played: number;
  won: number;
  points: number;
}

export interface DailyStats {
  played: number;
  solves: number;
  streak: number;
  bestStreak: number;
  lastDay: string;
}

export const EMPTY_DAILY: DailyStats = {
  played: 0,
  solves: 0,
  streak: 0,
  bestStreak: 0,
  lastDay: '',
};

export interface SoloStats {
  played: number;
  solves: number;
  guesses: number;
  streak: number;
  bestStreak: number;
  hints: number;
}

export const EMPTY_SOLO: SoloStats = {
  played: 0,
  solves: 0,
  guesses: 0,
  streak: 0,
  bestStreak: 0,
  hints: 0,
};

export interface Profile {
  userId: string;
  email: string;
  name: string;
  displayName: string;
  avatar: string;
  stats: Stats;
  solo: SoloStats;
  daily: DailyStats;
  games?: Record<GameKey, GameTally>;
  achievements?: { id: string; at: string; seen: boolean }[];
  banned?: boolean;
  createdAt?: Date;
}

export interface MatchRound {
  round: number;
  answer: string;
  winnerId: string | null;
  draw?: boolean;
  ttt?: { board: (string | null)[]; line: number[] | null } | null;
  boards: {
    playerId: string;
    words: string[];
    solved: boolean;
    solveMs: number | null;
    hints: number;
  }[];
}

export type GameKey = 'wordbattle' | 'tictactoe' | 'anagram';

export interface GameTally {
  played: number;
  won: number;
}

export type MatchMode = 'race' | 'solo' | 'daily';

export interface MatchRecord {
  matchId: string;
  code: string;
  mode: MatchMode;
  day?: string | null;
  game: GameKey;
  players: { userId: string; name: string; score: number }[];
  winnerId: string | null;
  rounds: MatchRound[];
  playedAt: string;
}

const userSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: String, default: '' },
    name: { type: String, default: '' },
    displayName: { type: String, default: '' },
    avatar: { type: String, default: 'ember' },
    stats: {
      played: { type: Number, default: 0 },
      won: { type: Number, default: 0 },
      rounds: { type: Number, default: 0 },
      roundsWon: { type: Number, default: 0 },
      solves: { type: Number, default: 0 },
      guesses: { type: Number, default: 0 },
      streak: { type: Number, default: 0 },
      bestStreak: { type: Number, default: 0 },
      points: { type: Number, default: 0 },
    },
    banned: { type: Boolean, default: false },
    achievements: [
      {
        _id: false,
        id: { type: String, required: true },
        at: { type: Date, default: Date.now },
        seen: { type: Boolean, default: false },
      },
    ],
    games: {
      wordbattle: { played: { type: Number, default: 0 }, won: { type: Number, default: 0 } },
      tictactoe: { played: { type: Number, default: 0 }, won: { type: Number, default: 0 } },
      anagram: { played: { type: Number, default: 0 }, won: { type: Number, default: 0 } },
    },
    solo: {
      played: { type: Number, default: 0 },
      solves: { type: Number, default: 0 },
      guesses: { type: Number, default: 0 },
      streak: { type: Number, default: 0 },
      bestStreak: { type: Number, default: 0 },
      hints: { type: Number, default: 0 },
    },
    daily: {
      played: { type: Number, default: 0 },
      solves: { type: Number, default: 0 },
      streak: { type: Number, default: 0 },
      bestStreak: { type: Number, default: 0 },
      lastDay: { type: String, default: '' },
    },
  },
  { collection: 'users', timestamps: true },
);

const matchSchema = new Schema(
  {
    matchId: { type: String, required: true, unique: true, index: true },
    code: { type: String, default: '' },
    mode: { type: String, default: 'race', index: true },
    day: { type: String, default: null, index: true },
    game: { type: String, default: 'wordbattle', index: true },
    players: [
      {
        _id: false,
        userId: { type: String, required: true },
        name: { type: String, default: '' },
        score: { type: Number, default: 0 },
      },
    ],
    winnerId: { type: String, default: null },
    rounds: { type: Array, default: [] },
    playedAt: { type: Date, default: Date.now, index: true },
  },
  { collection: 'matches' },
);

matchSchema.index({ 'players.userId': 1, playedAt: -1 });

const UserModel: Model<Profile> =
  (mongoose.models.User as Model<Profile> | undefined) ??
  (mongoose.model('User', userSchema) as unknown as Model<Profile>);

const friendSchema = new Schema(
  {
    fromId: { type: String, required: true, index: true },
    toId: { type: String, required: true, index: true },
    status: { type: String, default: 'pending', index: true },
  },
  { collection: 'friends', timestamps: true },
);

friendSchema.index({ fromId: 1, toId: 1 }, { unique: true });

const FriendModel: Model<FriendLink> =
  (mongoose.models.Friend as Model<FriendLink> | undefined) ??
  (mongoose.model('Friend', friendSchema) as unknown as Model<FriendLink>);

const sanctionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    kind: { type: String, required: true },
    reason: { type: String, default: '' },
    actor: { type: String, default: 'admin' },
    until: { type: Date, default: null },
    acknowledged: { type: Boolean, default: false },
    liftedAt: { type: Date, default: null },
  },
  { collection: 'sanctions', timestamps: true },
);

const SanctionModel: Model<SanctionRecord> =
  (mongoose.models.Sanction as Model<SanctionRecord> | undefined) ??
  (mongoose.model('Sanction', sanctionSchema) as unknown as Model<SanctionRecord>);

const MatchModel: Model<MatchRecord> =
  (mongoose.models.Match as Model<MatchRecord> | undefined) ??
  (mongoose.model('Match', matchSchema) as unknown as Model<MatchRecord>);

const cached = globalThis as unknown as { mongooseConn?: Promise<typeof mongoose> | null };

export async function connect(): Promise<boolean> {
  if (!uri) return false;
  if (mongoose.connection.readyState === 1) return true;

  try {
    const dbName = process.env.MONGODB_DB?.trim();

    cached.mongooseConn ??= mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      ...(dbName ? { dbName } : {}),
    });
    await cached.mongooseConn;
    return true;
  } catch (err) {
    cached.mongooseConn = null;
    console.error('mongo connection failed:', (err as Error).message);
    return false;
  }
}

export const databaseReady = cache(async () => connect());

function plain<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

export async function readProfile(userId: string): Promise<Profile | null> {
  if (!(await connect())) return null;

  const doc = await UserModel.findOne({ userId }).lean<Profile>().exec();
  if (!doc) return null;

  const profile = plain(doc);
  profile.stats = { ...EMPTY_STATS, ...(profile.stats ?? {}) };
  profile.solo = { ...EMPTY_SOLO, ...(profile.solo ?? {}) };
  profile.daily = { ...EMPTY_DAILY, ...(profile.daily ?? {}) };
  profile.achievements = profile.achievements ?? [];
  return profile;
}

export const getProfile = cache(readProfile);

export async function saveProfile(
  userId: string,
  patch: Partial<Omit<Profile, 'userId'>>,
): Promise<Profile | null> {
  if (!(await connect())) return null;
  const doc = await UserModel.findOneAndUpdate(
    { userId },
    { $set: { ...patch, userId } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  )
    .lean<Profile>()
    .exec();
  return plain(doc);
}

export interface MatchInput {
  matchId: string;
  code: string;
  mode: MatchMode;
  day?: string | null;
  game: GameKey;
  players: { userId: string; name: string; score: number }[];
  winnerId: string | null;
  rounds: MatchRound[];
}

export async function recordMatch(input: MatchInput): Promise<boolean> {
  if (!(await connect())) return false;

  const existing = await MatchModel.findOne({ matchId: input.matchId }).lean().exec();
  if (existing) return true;

  if (input.mode === 'daily') {
    const played = await MatchModel.findOne({
      mode: 'daily',
      day: input.day ?? '',
      'players.userId': input.players[0]?.userId,
    })
      .lean()
      .exec();

    if (played) return true;
  }

  await MatchModel.create({ ...input, playedAt: new Date().toISOString() });

  for (const player of input.players) {
    const boards = input.rounds
      .map((round) => round.boards.find((board) => board.playerId === player.userId))
      .filter((board): board is MatchRound['boards'][number] => Boolean(board));

    if (boards.length === 0) continue;

    const profile = await getProfile(player.userId);
    const solves = boards.filter((board) => board.solved).length;
    const guesses = boards.reduce((total, board) => total + board.words.length, 0);

    if (input.mode === 'daily') {
      const day = input.day ?? '';
      const solved = boards.some((board) => board.solved);
      const previous = profile?.daily ?? EMPTY_DAILY;

      if (previous.lastDay === day) continue;

      const yesterday = new Date(new Date(`${day}T00:00:00Z`).getTime() - 86_400_000)
        .toISOString()
        .slice(0, 10);
      const continues = solved && previous.lastDay === yesterday;
      const streak = solved ? (continues ? previous.streak + 1 : 1) : 0;

      await UserModel.updateOne(
        { userId: player.userId },
        {
          $inc: { 'daily.played': 1, 'daily.solves': solved ? 1 : 0 },
          $set: {
            'daily.streak': streak,
            'daily.bestStreak': Math.max(streak, previous.bestStreak),
            'daily.lastDay': day,
          },
        },
        { upsert: true },
      ).exec();

      continue;
    }

    if (input.mode === 'solo') {
      const cleanSolve = boards.every((board) => board.solved && board.hints === 0);
      const streak = cleanSolve ? (profile?.solo.streak ?? 0) + 1 : 0;

      await UserModel.updateOne(
        { userId: player.userId },
        {
          $inc: {
            'solo.played': 1,
            'solo.solves': solves,
            'solo.guesses': guesses,
            'solo.hints': boards.reduce((total, board) => total + board.hints, 0),
          },
          $set: {
            'solo.streak': streak,
            'solo.bestStreak': Math.max(streak, profile?.solo.bestStreak ?? 0),
          },
        },
        { upsert: true },
      ).exec();

      continue;
    }

    const rounds = input.rounds.filter((round) =>
      round.boards.some((board) => board.playerId === player.userId),
    );
    const won = input.winnerId === player.userId;
    const streak = won ? (profile?.stats.streak ?? 0) + 1 : 0;

    await UserModel.updateOne(
      { userId: player.userId },
      {
        $inc: {
          [`games.${input.game ?? 'wordbattle'}.played`]: 1,
          [`games.${input.game ?? 'wordbattle'}.won`]: won ? 1 : 0,
          'stats.played': 1,
          'stats.won': won ? 1 : 0,
          'stats.rounds': rounds.length,
          'stats.roundsWon': rounds.filter((round) => round.winnerId === player.userId).length,
          'stats.solves': solves,
          'stats.guesses': guesses,
          'stats.points': player.score,
        },
        $set: {
          'stats.streak': streak,
          'stats.bestStreak': Math.max(streak, profile?.stats.bestStreak ?? 0),
        },
      },
      { upsert: true },
    ).exec();
  }

  return true;
}

export async function recentMatches(userId: string, limit = 5): Promise<MatchRecord[]> {
  if (!(await connect())) return [];

  const docs = await MatchModel.find({ 'players.userId': userId, mode: 'race' })
    .sort({ playedAt: -1 })
    .limit(limit)
    .lean<MatchRecord[]>()
    .exec();

  return docs.map(plain);
}

export async function matchById(matchId: string, userId: string): Promise<MatchRecord | null> {
  if (!(await connect())) return null;

  const doc = await MatchModel.findOne({ matchId }).lean<MatchRecord>().exec();
  if (!doc) return null;
  if (!doc.players.some((player) => player.userId === userId)) return null;

  return plain(doc);
}

export async function matchCount(userId: string): Promise<number> {
  if (!(await connect())) return 0;
  return MatchModel.countDocuments({ 'players.userId': userId }).exec();
}

export function clampPage(page: number, total: number, size: number) {
  const pages = Math.max(1, Math.ceil(total / size));
  return Math.min(Math.max(1, page), pages);
}

export interface HistoryFilter {
  game?: GameKey | 'all';
  result?: 'all' | 'won' | 'lost';
}

export async function matchPage(
  userId: string,
  page: number,
  size = 20,
  options: HistoryFilter = {},
) {
  if (!(await connect())) return { matches: [] as MatchRecord[], total: 0, page: 1 };

  const filter: Record<string, unknown> = { 'players.userId': userId, mode: 'race' };

  if (options.game && options.game !== 'all') filter.game = options.game;
  if (options.result === 'won') filter.winnerId = userId;
  if (options.result === 'lost') filter.winnerId = { $nin: [userId, null] };
  const total = await MatchModel.countDocuments(filter).exec();
  const safe = clampPage(page, total, size);

  const docs = await MatchModel.find(filter)
    .sort({ playedAt: -1 })
    .skip((safe - 1) * size)
    .limit(size)
    .lean<MatchRecord[]>()
    .exec();

  return { matches: docs.map(plain), total, page: safe };
}

export async function leaderboard(limit = 20): Promise<Profile[]> {
  if (!(await connect())) return [];

  const docs = await UserModel.find({ 'stats.played': { $gt: 0 }, banned: { $ne: true } })
    .sort({ 'stats.points': -1, 'stats.won': -1 })
    .limit(limit)
    .lean<Profile[]>()
    .exec();

  return docs.map((doc) => {
    const profile = plain(doc);
    profile.stats = { ...EMPTY_STATS, ...(profile.stats ?? {}) };
    profile.solo = { ...EMPTY_SOLO, ...(profile.solo ?? {}) };
    return profile;
  });
}

function toCard(profile: Profile): PlayerCard {
  const stats = { ...EMPTY_STATS, ...(profile.stats ?? {}) };

  return {
    userId: profile.userId,
    displayName: profile.displayName || 'player',
    avatar: profile.avatar || 'ember',
    played: stats.played,
    won: stats.won,
    points: stats.points,
  };
}

export async function displayNameTaken(name: string, userId: string): Promise<boolean> {
  if (!(await connect())) return false;

  const existing = await UserModel.findOne({
    displayName: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    userId: { $ne: userId },
  })
    .lean()
    .exec();

  return Boolean(existing);
}

export async function searchPlayers(query: string, userId: string): Promise<PlayerCard[]> {
  if (!(await connect())) return [];

  const term = query.trim();
  if (term.length < 2) return [];

  const docs = await UserModel.find({
    userId: { $ne: userId },
    banned: { $ne: true },
    displayName: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
  })
    .limit(20)
    .lean<Profile[]>()
    .exec();

  return docs.map((doc) => toCard(plain(doc)));
}

export async function playersByIds(ids: string[]): Promise<PlayerCard[]> {
  if (ids.length === 0 || !(await connect())) return [];

  const docs = await UserModel.find({ userId: { $in: ids } })
    .lean<Profile[]>()
    .exec();

  return docs.map((doc) => toCard(plain(doc)));
}

export async function requestFriend(fromId: string, toId: string) {
  if (fromId === toId) return { ok: false, error: 'that is you' } as const;
  if (!(await connect())) return { ok: false, error: 'database unavailable' } as const;

  const reverse = await FriendModel.findOne({ fromId: toId, toId: fromId }).lean<FriendLink>().exec();

  if (reverse) {
    if (reverse.status === 'accepted') return { ok: false, error: 'already friends' } as const;

    await FriendModel.updateOne({ fromId: toId, toId: fromId }, { $set: { status: 'accepted' } }).exec();
    return { ok: true, accepted: true } as const;
  }

  const existing = await FriendModel.findOne({ fromId, toId }).lean<FriendLink>().exec();
  if (existing) {
    return existing.status === 'accepted'
      ? ({ ok: false, error: 'already friends' } as const)
      : ({ ok: false, error: 'request already sent' } as const);
  }

  await FriendModel.create({ fromId, toId, status: 'pending' });
  return { ok: true, accepted: false } as const;
}

export async function respondToRequest(userId: string, fromId: string, accept: boolean) {
  if (!(await connect())) return false;

  if (accept) {
    await FriendModel.updateOne({ fromId, toId: userId }, { $set: { status: 'accepted' } }).exec();
  } else {
    await FriendModel.deleteOne({ fromId, toId: userId }).exec();
  }

  return true;
}

export async function removeFriend(userId: string, otherId: string) {
  if (!(await connect())) return false;

  await FriendModel.deleteMany({
    $or: [
      { fromId: userId, toId: otherId },
      { fromId: otherId, toId: userId },
    ],
  }).exec();

  return true;
}

export async function friendIds(userId: string): Promise<string[]> {
  if (!(await connect())) return [];

  const links = await FriendModel.find({
    status: 'accepted',
    $or: [{ fromId: userId }, { toId: userId }],
  })
    .lean<FriendLink[]>()
    .exec();

  return links.map((link) => (link.fromId === userId ? link.toId : link.fromId));
}

export async function friendList(userId: string): Promise<PlayerCard[]> {
  return playersByIds(await friendIds(userId));
}

export async function pendingRequests(userId: string): Promise<PlayerCard[]> {
  if (!(await connect())) return [];

  const links = await FriendModel.find({ toId: userId, status: 'pending' }).lean<FriendLink[]>().exec();
  return playersByIds(links.map((link) => link.fromId));
}

export async function sentRequestIds(userId: string): Promise<string[]> {
  if (!(await connect())) return [];

  const links = await FriendModel.find({ fromId: userId, status: 'pending' }).lean<FriendLink[]>().exec();
  return links.map((link) => link.toId);
}

export interface DayPoint {
  day: string;
  matches: number;
  players: number;
  signups: number;
  wordbattle: number;
  tictactoe: number;
}

export interface WordStat {
  word: string;
  seen: number;
  solved: number;
  rate: number;
}

export interface AdminOverview {
  users: number;
  matches: number;
  rounds: number;
  soloGames: number;
  newUsers: number;
  activePlayers: number;
  returning: number;
  avgRounds: number;
  solveRate: number;
  liveSanctions: number;
  perDay: DayPoint[];
  top: PlayerCard[];
  hardest: WordStat[];
  easiest: WordStat[];
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

interface RecentMatch {
  playedAt: Date | string;
  mode: 'race' | 'solo';
  game: GameKey;
  players: { userId: string }[];
  rounds: { boards?: { solved?: boolean }[] }[];
}

export async function adminOverview(days = 14): Promise<AdminOverview | null> {
  if (!(await connect())) return null;

  const since = new Date(Date.now() - days * 86_400_000);

  const [users, matches, soloGames, newUsers, recent, signups, top, liveSanctions] =
    await Promise.all([
      UserModel.countDocuments({}).exec(),
      MatchModel.countDocuments({ mode: 'race' }).exec(),
      MatchModel.countDocuments({ mode: 'solo' }).exec(),
      UserModel.countDocuments({ createdAt: { $gte: since } }).exec(),
      MatchModel.find({ playedAt: { $gte: since.toISOString() } })
        .select({ playedAt: 1, rounds: 1, players: 1, game: 1, mode: 1 })
        .lean<RecentMatch[]>()
        .exec(),
      UserModel.find({ createdAt: { $gte: since } })
        .select({ createdAt: 1 })
        .lean<{ createdAt: Date }[]>()
        .exec(),
      UserModel.find({ 'stats.played': { $gt: 0 }, banned: { $ne: true } })
        .sort({ 'stats.points': -1, 'stats.won': -1 })
        .limit(5)
        .lean<Profile[]>()
        .exec(),
      SanctionModel.countDocuments({ liftedAt: null }).exec(),
    ]);

  const buckets = new Map<string, DayPoint>();
  const seenPerDay = new Map<string, Set<string>>();

  for (let i = days - 1; i >= 0; i -= 1) {
    const day = dayKey(new Date(Date.now() - i * 86_400_000));

    buckets.set(day, {
      day,
      matches: 0,
      players: 0,
      signups: 0,
      wordbattle: 0,
      tictactoe: 0,
    });
    seenPerDay.set(day, new Set());
  }

  const daysPlayed = new Map<string, Set<string>>();
  const activePlayers = new Set<string>();

  let rounds = 0;
  let raceRounds = 0;
  let boardsPlayed = 0;
  let boardsSolved = 0;

  for (const match of recent) {
    const day = dayKey(new Date(match.playedAt));
    const bucket = buckets.get(day);

    rounds += match.rounds?.length ?? 0;
    if (match.mode === 'race') raceRounds += match.rounds?.length ?? 0;

    for (const round of match.rounds ?? []) {
      for (const board of round.boards ?? []) {
        boardsPlayed += 1;
        if (board.solved) boardsSolved += 1;
      }
    }

    for (const player of match.players ?? []) {
      activePlayers.add(player.userId);
      seenPerDay.get(day)?.add(player.userId);

      const seen = daysPlayed.get(player.userId) ?? new Set<string>();
      seen.add(day);
      daysPlayed.set(player.userId, seen);
    }

    if (!bucket) continue;

    bucket.matches += 1;
    if (match.game === 'tictactoe') bucket.tictactoe += 1;
    else bucket.wordbattle += 1;
  }

  for (const [day, players] of seenPerDay) {
    const bucket = buckets.get(day);
    if (bucket) bucket.players = players.size;
  }

  for (const user of signups) {
    const bucket = buckets.get(dayKey(new Date(user.createdAt)));
    if (bucket) bucket.signups += 1;
  }

  let returning = 0;
  for (const seen of daysPlayed.values()) {
    if (seen.size > 1) returning += 1;
  }

  const raceMatches = recent.filter((match) => match.mode === 'race').length;
  const words = await wordStats();

  return {
    users,
    matches,
    rounds,
    soloGames,
    newUsers,
    activePlayers: activePlayers.size,
    returning,
    avgRounds: raceMatches > 0 ? Number((raceRounds / raceMatches).toFixed(1)) : 0,
    solveRate: boardsPlayed > 0 ? Math.round((boardsSolved / boardsPlayed) * 100) : 0,
    liveSanctions,
    perDay: [...buckets.values()],
    top: top.map((doc) => toCard(plain(doc))),
    hardest: words.hardest,
    easiest: words.easiest,
  };
}

export async function wordStats(): Promise<{ hardest: WordStat[]; easiest: WordStat[] }> {
  if (!(await connect())) return { hardest: [], easiest: [] };

  const rows = await mongoose.connection
    .collection('vocab')
    .aggregate<{ _id: string; seen: number; solved: number }>([
      { $group: { _id: '$word', seen: { $sum: '$seen' }, solved: { $sum: '$correct' } } },
      { $match: { seen: { $gte: 2 } } },
    ])
    .toArray();

  const stats: WordStat[] = rows.map((row) => ({
    word: row._id,
    seen: row.seen,
    solved: row.solved,
    rate: row.seen > 0 ? Math.round((row.solved / row.seen) * 100) : 0,
  }));

  const byRate = [...stats].sort((a, b) => a.rate - b.rate || b.seen - a.seen);

  return {
    hardest: byRate.slice(0, 5),
    easiest: [...byRate].reverse().slice(0, 5),
  };
}

export interface AdminUser extends PlayerCard {
  email: string;
  banned: boolean;
  soloPlayed: number;
  joined: string | null;
}

export async function adminUserPage(query: string, page: number, size = 20) {
  if (!(await connect())) return { users: [] as AdminUser[], total: 0, page: 1 };

  const term = query.trim();
  const filter = term
    ? {
        $or: [
          { displayName: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
          { email: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        ],
      }
    : {};

  const total = await UserModel.countDocuments(filter).exec();
  const safe = clampPage(page, total, size);

  const docs = await UserModel.find(filter)
    .sort({ createdAt: -1 })
    .skip((safe - 1) * size)
    .limit(size)
    .lean<(Profile & { banned?: boolean; createdAt?: Date })[]>()
    .exec();

  const users = docs.map((doc) => {
    const profile = plain(doc);
    const card = toCard(profile);

    return {
      ...card,
      email: profile.email ?? '',
      banned: Boolean(profile.banned),
      soloPlayed: profile.solo?.played ?? 0,
      joined: profile.createdAt ? String(profile.createdAt).slice(0, 10) : null,
    };
  });

  return { users, total, page: safe };
}

export async function adminMatchPage(page: number, size = 20) {
  if (!(await connect())) return { matches: [] as MatchRecord[], total: 0, page: 1 };

  const total = await MatchModel.countDocuments({}).exec();
  const safe = clampPage(page, total, size);

  const docs = await MatchModel.find({})
    .sort({ playedAt: -1 })
    .skip((safe - 1) * size)
    .limit(size)
    .lean<MatchRecord[]>()
    .exec();

  return { matches: docs.map(plain), total, page: safe };
}

export async function setBanned(userId: string, banned: boolean) {
  if (!(await connect())) return false;

  await UserModel.updateOne({ userId }, { $set: { banned } }).exec();
  return true;
}

export async function bannedIds(): Promise<string[]> {
  if (!(await connect())) return [];

  const docs = await UserModel.find({ banned: true }).select({ userId: 1 }).lean<{ userId: string }[]>().exec();
  return docs.map((doc) => doc.userId);
}

export interface ProfileSeries {
  points: number[];
  form: ('win' | 'loss' | 'draw')[];
  guessSpread: { key: string; value: number }[];
  wins: number;
  losses: number;
  draws: number;
}

export async function profileSeries(userId: string, limit = 20): Promise<ProfileSeries> {
  const blank: ProfileSeries = {
    points: [],
    form: [],
    guessSpread: [1, 2, 3, 4, 5, 6, 7].map((key) => ({ key: String(key), value: 0 })),
    wins: 0,
    losses: 0,
    draws: 0,
  };

  if (!(await connect())) return blank;

  const docs = await MatchModel.find({ 'players.userId': userId, mode: 'race' })
    .sort({ playedAt: -1 })
    .limit(limit)
    .lean<MatchRecord[]>()
    .exec();

  const matches = docs.reverse();
  const spread = new Map<number, number>();

  let running = 0;

  for (const match of matches) {
    const me = match.players.find((player) => player.userId === userId);
    running += me?.score ?? 0;
    blank.points.push(running);

    if (match.winnerId === userId) {
      blank.form.push('win');
      blank.wins += 1;
    } else if (match.winnerId === null) {
      blank.form.push('draw');
      blank.draws += 1;
    } else {
      blank.form.push('loss');
      blank.losses += 1;
    }

    for (const round of match.rounds ?? []) {
      const board = round.boards?.find((entry) => entry.playerId === userId);
      if (!board?.solved) continue;

      const count = Math.min(7, Math.max(1, board.words.length));
      spread.set(count, (spread.get(count) ?? 0) + 1);
    }
  }

  blank.guessSpread = [1, 2, 3, 4, 5, 6, 7].map((key) => ({
    key: String(key),
    value: spread.get(key) ?? 0,
  }));

  blank.form.reverse();
  return blank;
}

export async function publicProfile(userId: string) {
  if (!(await connect())) return null;

  const doc = await UserModel.findOne({ userId, banned: { $ne: true } }).lean<Profile>().exec();
  if (!doc) return null;

  const profile = plain(doc);
  profile.stats = { ...EMPTY_STATS, ...(profile.stats ?? {}) };
  profile.solo = { ...EMPTY_SOLO, ...(profile.solo ?? {}) };

  return profile;
}

export async function friendState(userId: string, otherId: string) {
  if (!(await connect())) return 'none' as const;

  const link = await FriendModel.findOne({
    $or: [
      { fromId: userId, toId: otherId },
      { fromId: otherId, toId: userId },
    ],
  })
    .lean<FriendLink>()
    .exec();

  if (!link) return 'none' as const;
  if (link.status === 'accepted') return 'friends' as const;

  return link.fromId === userId ? ('sent' as const) : ('incoming' as const);
}

export async function gameLeaderboard(game: GameKey, limit = 20) {
  if (!(await connect())) return [];

  const docs = await UserModel.find({
    [`games.${game}.played`]: { $gt: 0 },
    banned: { $ne: true },
  })
    .sort({ [`games.${game}.won`]: -1, [`games.${game}.played`]: 1 })
    .limit(limit)
    .lean<Profile[]>()
    .exec();

  return docs.map((doc) => {
    const profile = plain(doc);
    const tally = profile.games?.[game] ?? { played: 0, won: 0 };

    return {
      userId: profile.userId,
      displayName: profile.displayName || 'player',
      avatar: profile.avatar || 'ember',
      played: tally.played,
      won: tally.won,
    };
  });
}

export const BAN_DURATIONS = [
  { label: '1 hour', hours: 1 },
  { label: '1 day', hours: 24 },
  { label: '1 week', hours: 168 },
  { label: 'forever', hours: 0 },
];

export async function issueSanction(input: {
  userId: string;
  kind: SanctionKind;
  reason: string;
  hours: number;
  actor: string;
}) {
  if (!(await connect())) return false;

  const until =
    input.kind === 'ban' && input.hours > 0
      ? new Date(Date.now() + input.hours * 3_600_000).toISOString()
      : null;

  await SanctionModel.create({
    userId: input.userId,
    kind: input.kind,
    reason: input.reason.slice(0, 200),
    actor: input.actor,
    until,
    acknowledged: false,
    liftedAt: null,
  });

  if (input.kind === 'ban') await UserModel.updateOne({ userId: input.userId }, { $set: { banned: true } }).exec();

  return true;
}

export async function liftSanction(id: string) {
  if (!(await connect())) return false;

  const sanction = await SanctionModel.findById(id).lean<SanctionRecord>().exec();
  if (!sanction) return false;

  await SanctionModel.updateOne({ _id: id }, { $set: { liftedAt: new Date().toISOString() } }).exec();

  if (sanction.kind === 'ban') {
    const others = await SanctionModel.countDocuments({
      userId: sanction.userId,
      kind: 'ban',
      liftedAt: null,
      _id: { $ne: id },
    }).exec();

    if (others === 0) {
      await UserModel.updateOne({ userId: sanction.userId }, { $set: { banned: false } }).exec();
    }
  }

  return true;
}

function untilMs(value: SanctionRecord['until']) {
  return value ? new Date(value).getTime() : null;
}

export function sanctionIsLive(sanction: SanctionRecord) {
  if (sanction.liftedAt) return false;

  const expires = untilMs(sanction.until);
  return expires === null || expires > Date.now();
}

export async function activeSanctions() {
  if (!(await connect())) return { bans: [], warnings: [] };

  const docs = await SanctionModel.find({ liftedAt: null }).lean<SanctionRecord[]>().exec();

  const bans = docs
    .filter((doc) => doc.kind === 'ban' && sanctionIsLive(doc))
    .map((doc) => ({
      userId: doc.userId,
      reason: doc.reason,
      until: untilMs(doc.until),
    }));

  const warnings = docs
    .filter((doc) => doc.kind === 'warn' && !doc.acknowledged)
    .map((doc) => ({ userId: doc.userId, reason: doc.reason }));

  return { bans, warnings };
}

export async function sanctionPage(page: number, size = 20) {
  if (!(await connect())) return { sanctions: [] as SanctionRecord[], total: 0, page: 1 };

  const total = await SanctionModel.countDocuments({}).exec();
  const safe = clampPage(page, total, size);

  const docs = await SanctionModel.find({})
    .sort({ createdAt: -1 })
    .skip((safe - 1) * size)
    .limit(size)
    .lean<SanctionRecord[]>()
    .exec();

  return {
    sanctions: docs.map((doc) => ({ ...plain(doc), _id: String(doc._id) })),
    total,
    page: safe,
  };
}

export async function myNotices(userId: string) {
  if (!(await connect())) return [];

  const docs = await SanctionModel.find({ userId, acknowledged: false, liftedAt: null })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean<SanctionRecord[]>()
    .exec();

  return docs.map((doc) => ({ ...plain(doc), _id: String(doc._id) }));
}

export async function acknowledgeNotices(userId: string) {
  if (!(await connect())) return false;

  await SanctionModel.updateMany({ userId, acknowledged: false }, { $set: { acknowledged: true } }).exec();
  return true;
}

export function todayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export interface DailyEntry {
  userId: string;
  displayName: string;
  avatar: string;
  guesses: number;
  solved: boolean;
  ms: number | null;
}

export async function dailyResult(userId: string, day = todayKey()) {
  if (!(await connect())) return null;

  const doc = await MatchModel.findOne({ mode: 'daily', day, 'players.userId': userId })
    .lean<MatchRecord>()
    .exec();

  return doc ? plain(doc) : null;
}

export async function dailyBoard(day = todayKey(), limit = 20): Promise<DailyEntry[]> {
  if (!(await connect())) return [];

  const docs = await MatchModel.find({ mode: 'daily', day })
    .limit(200)
    .lean<MatchRecord[]>()
    .exec();

  const ids = docs.map((doc) => doc.players[0]?.userId).filter(Boolean);
  const cards = await playersByIds(ids);
  const byId = new Map(cards.map((card) => [card.userId, card]));

  const rows: DailyEntry[] = docs.map((doc) => {
    const board = doc.rounds?.[0]?.boards?.[0];
    const card = byId.get(doc.players[0]?.userId ?? '');

    return {
      userId: doc.players[0]?.userId ?? '',
      displayName: card?.displayName ?? 'player',
      avatar: card?.avatar ?? 'ember',
      guesses: board?.words.length ?? 0,
      solved: Boolean(board?.solved),
      ms: board?.solveMs ?? null,
    };
  });

  return rows
    .sort((a, b) => {
      if (a.solved !== b.solved) return a.solved ? -1 : 1;
      if (a.guesses !== b.guesses) return a.guesses - b.guesses;
      return (a.ms ?? Infinity) - (b.ms ?? Infinity);
    })
    .slice(0, limit);
}

export async function dailyCount(day = todayKey()) {
  if (!(await connect())) return { played: 0, solved: 0 };

  const [played, solved] = await Promise.all([
    MatchModel.countDocuments({ mode: 'daily', day }).exec(),
    MatchModel.countDocuments({ mode: 'daily', day, 'rounds.boards.solved': true }).exec(),
  ]);

  return { played, solved };
}

export async function vocabTotal(userId: string): Promise<number> {
  if (!(await connect())) return 0;
  return mongoose.connection.collection('vocab').countDocuments({ userId });
}

export async function grantAchievements(userId: string): Promise<string[]> {
  const profile = await readProfile(userId);
  if (!profile) return [];

  const { newlyEarned } = await import('@/lib/achievements');
  const words = await vocabTotal(userId);
  const already = (profile.achievements ?? []).map((entry) => entry.id);
  const fresh = newlyEarned(profile, words, already);

  if (fresh.length === 0) return [];

  await UserModel.updateOne(
    { userId },
    {
      $push: {
        achievements: {
          $each: fresh.map((id) => ({ id, at: new Date(), seen: false })),
        },
      },
    },
  ).exec();

  return fresh;
}

export async function unseenAchievements(userId: string) {
  const profile = await readProfile(userId);
  if (!profile) return [];

  return (profile.achievements ?? []).filter((entry) => !entry.seen).map((entry) => entry.id);
}

export async function markAchievementsSeen(userId: string) {
  if (!(await connect())) return false;

  await UserModel.updateOne(
    { userId },
    { $set: { 'achievements.$[entry].seen': true } },
    { arrayFilters: [{ 'entry.seen': false }] },
  ).exec();

  return true;
}
