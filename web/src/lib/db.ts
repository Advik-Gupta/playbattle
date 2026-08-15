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

export interface Profile {
  userId: string;
  email: string;
  name: string;
  displayName: string;
  stats: Stats;
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
  }[];
}

export interface MatchRecord {
  matchId: string;
  code: string;
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
  },
  { collection: 'users', timestamps: true },
);

const matchSchema = new Schema(
  {
    matchId: { type: String, required: true, unique: true, index: true },
    code: { type: String, default: '' },
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

const UserModel: Model<Profile> =
  (mongoose.models.User as Model<Profile> | undefined) ??
  (mongoose.model('User', userSchema) as unknown as Model<Profile>);

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

function plain<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!(await connect())) return null;
  const doc = await UserModel.findOne({ userId }).lean<Profile>().exec();
  if (!doc) return null;

  const profile = plain(doc);
  profile.stats = { ...EMPTY_STATS, ...(profile.stats ?? {}) };
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
    const rounds = input.rounds.filter((round) =>
      round.boards.some((board) => board.playerId === player.userId),
    );
    const boards = rounds
      .map((round) => round.boards.find((board) => board.playerId === player.userId))
      .filter((board): board is MatchRound['boards'][number] => Boolean(board));

    const won = input.winnerId === player.userId;
    const profile = await getProfile(player.userId);
    const streak = won ? (profile?.stats.streak ?? 0) + 1 : 0;

    await UserModel.updateOne(
      { userId: player.userId },
      {
        $inc: {
          'stats.played': 1,
          'stats.won': won ? 1 : 0,
          'stats.rounds': rounds.length,
          'stats.roundsWon': rounds.filter((round) => round.winnerId === player.userId).length,
          'stats.solves': boards.filter((board) => board.solved).length,
          'stats.guesses': boards.reduce((total, board) => total + board.words.length, 0),
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

  const docs = await MatchModel.find({ 'players.userId': userId })
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
    .sort({ 'stats.points': -1 })
    .limit(limit)
    .lean<Profile[]>()
    .exec();

  return docs.map((doc) => {
    const profile = plain(doc);
    profile.stats = { ...EMPTY_STATS, ...(profile.stats ?? {}) };
    return profile;
  });
}
