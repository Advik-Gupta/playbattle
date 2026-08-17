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

export interface FriendLink {
  fromId: string;
  toId: string;
  status: 'pending' | 'accepted';
}

export interface PlayerCard {
  userId: string;
  displayName: string;
  played: number;
  won: number;
  points: number;
}

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
  stats: Stats;
  solo: SoloStats;
  banned?: boolean;
  createdAt?: Date;
}

export interface MatchRound {
  round: number;
  answer: string;
  winnerId: string | null;
  boards: {
    playerId: string;
    words: string[];
    solved: boolean;
    solveMs: number | null;
    hints: number;
  }[];
}

export interface MatchRecord {
  matchId: string;
  code: string;
  mode: 'race' | 'solo';
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
    solo: {
      played: { type: Number, default: 0 },
      solves: { type: Number, default: 0 },
      guesses: { type: Number, default: 0 },
      streak: { type: Number, default: 0 },
      bestStreak: { type: Number, default: 0 },
      hints: { type: Number, default: 0 },
    },
  },
  { collection: 'users', timestamps: true },
);

const matchSchema = new Schema(
  {
    matchId: { type: String, required: true, unique: true, index: true },
    code: { type: String, default: '' },
    mode: { type: String, default: 'race', index: true },
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

const MatchModel: Model<MatchRecord> =
  (mongoose.models.Match as Model<MatchRecord> | undefined) ??
  (mongoose.model('Match', matchSchema) as unknown as Model<MatchRecord>);

const cached = globalThis as unknown as { mongooseConn?: Promise<typeof mongoose> | null };

async function connect(): Promise<boolean> {
  if (!uri) return false;
  if (mongoose.connection.readyState === 1) return true;

  try {
    cached.mongooseConn ??= mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    await cached.mongooseConn;
    return true;
  } catch (err) {
    cached.mongooseConn = null;
    console.error('mongo connection failed:', (err as Error).message);
    return false;
  }
}

export async function databaseReady() {
  return connect();
}

function plain<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!(await connect())) return null;
  const doc = await UserModel.findOne({ userId }).lean<Profile>().exec();
  if (!doc) return null;

  const profile = plain(doc);
  profile.stats = { ...EMPTY_STATS, ...(profile.stats ?? {}) };
  profile.solo = { ...EMPTY_SOLO, ...(profile.solo ?? {}) };
  return profile;
}

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
  mode: 'race' | 'solo';
  players: { userId: string; name: string; score: number }[];
  winnerId: string | null;
  rounds: MatchRound[];
}

export async function recordMatch(input: MatchInput): Promise<boolean> {
  if (!(await connect())) return false;

  const existing = await MatchModel.findOne({ matchId: input.matchId }).lean().exec();
  if (existing) return true;

  await MatchModel.create({ ...input, playedAt: new Date().toISOString() });

  for (const player of input.players) {
    const boards = input.rounds
      .map((round) => round.boards.find((board) => board.playerId === player.userId))
      .filter((board): board is MatchRound['boards'][number] => Boolean(board));

    if (boards.length === 0) continue;

    const profile = await getProfile(player.userId);
    const solves = boards.filter((board) => board.solved).length;
    const guesses = boards.reduce((total, board) => total + board.words.length, 0);

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

export async function matchCount(userId: string): Promise<number> {
  if (!(await connect())) return 0;
  return MatchModel.countDocuments({ 'players.userId': userId }).exec();
}

export async function matchPage(userId: string, page: number, size = 20) {
  if (!(await connect())) return { matches: [] as MatchRecord[], total: 0 };

  const skip = Math.max(0, page - 1) * size;
  const [docs, total] = await Promise.all([
    MatchModel.find({ 'players.userId': userId })
      .sort({ playedAt: -1 })
      .skip(skip)
      .limit(size)
      .lean<MatchRecord[]>()
      .exec(),
    MatchModel.countDocuments({ 'players.userId': userId }).exec(),
  ]);

  return { matches: docs.map(plain), total };
}

export async function leaderboard(limit = 20): Promise<Profile[]> {
  if (!(await connect())) return [];

  const docs = await UserModel.find({ 'stats.played': { $gt: 0 } })
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

export interface AdminOverview {
  users: number;
  matches: number;
  rounds: number;
  soloGames: number;
  newUsers: number;
  perDay: { day: string; count: number }[];
  top: PlayerCard[];
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function adminOverview(days = 14): Promise<AdminOverview | null> {
  if (!(await connect())) return null;

  const since = new Date(Date.now() - days * 86_400_000);

  const [users, matches, soloGames, newUsers, recent, top] = await Promise.all([
    UserModel.countDocuments({}).exec(),
    MatchModel.countDocuments({ mode: 'race' }).exec(),
    MatchModel.countDocuments({ mode: 'solo' }).exec(),
    UserModel.countDocuments({ createdAt: { $gte: since } }).exec(),
    MatchModel.find({ playedAt: { $gte: since.toISOString() } })
      .select({ playedAt: 1, rounds: 1 })
      .lean<{ playedAt: Date; rounds: unknown[] }[]>()
      .exec(),
    UserModel.find({ 'stats.played': { $gt: 0 } })
      .sort({ 'stats.points': -1, 'stats.won': -1 })
      .limit(5)
      .lean<Profile[]>()
      .exec(),
  ]);

  const counts = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    counts.set(dayKey(new Date(Date.now() - i * 86_400_000)), 0);
  }

  let rounds = 0;
  for (const match of recent) {
    rounds += match.rounds?.length ?? 0;
    const key = dayKey(new Date(match.playedAt));
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return {
    users,
    matches,
    rounds,
    soloGames,
    newUsers,
    perDay: [...counts].map(([day, count]) => ({ day, count })),
    top: top.map((doc) => toCard(plain(doc))),
  };
}

export interface AdminUser extends PlayerCard {
  email: string;
  banned: boolean;
  soloPlayed: number;
  joined: string | null;
}

export async function adminUserPage(query: string, page: number, size = 20) {
  if (!(await connect())) return { users: [] as AdminUser[], total: 0 };

  const term = query.trim();
  const filter = term
    ? {
        $or: [
          { displayName: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
          { email: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        ],
      }
    : {};

  const [docs, total] = await Promise.all([
    UserModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(Math.max(0, page - 1) * size)
      .limit(size)
      .lean<(Profile & { banned?: boolean; createdAt?: Date })[]>()
      .exec(),
    UserModel.countDocuments(filter).exec(),
  ]);

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

  return { users, total };
}

export async function adminMatchPage(page: number, size = 20) {
  if (!(await connect())) return { matches: [] as MatchRecord[], total: 0 };

  const [docs, total] = await Promise.all([
    MatchModel.find({})
      .sort({ playedAt: -1 })
      .skip(Math.max(0, page - 1) * size)
      .limit(size)
      .lean<MatchRecord[]>()
      .exec(),
    MatchModel.countDocuments({}).exec(),
  ]);

  return { matches: docs.map(plain), total };
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
