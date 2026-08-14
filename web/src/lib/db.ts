import mongoose, { Schema, type Model } from 'mongoose';

const uri = process.env.MONGODB_URI?.trim();

export const hasDatabase = Boolean(uri);

export interface Profile {
  userId: string;
  email: string;
  name: string;
  displayName: string;
  createdAt?: Date;
}

const userSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: String, default: '' },
    name: { type: String, default: '' },
    displayName: { type: String, default: '' },
  },
  { collection: 'users', timestamps: true },
);

const UserModel: Model<Profile> =
  (mongoose.models.User as Model<Profile> | undefined) ??
  (mongoose.model('User', userSchema) as unknown as Model<Profile>);

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

function plain(doc: Profile): Profile {
  const copy = { ...doc } as Profile & { _id?: unknown; __v?: unknown };
  delete copy._id;
  delete copy.__v;
  return copy;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!(await connect())) return null;
  const doc = await UserModel.findOne({ userId }).lean<Profile>().exec();
  return doc ? plain(doc) : null;
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
