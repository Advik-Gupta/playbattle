import mongoose, { Schema, type Model } from 'mongoose';
import { connect } from '@/lib/db';

export type WordStatus = 'learning' | 'known';

export interface VocabEntry {
  userId: string;
  word: string;
  status: WordStatus;
  seen: number;
  correct: number;
  lastSeen: string;
}

export interface Meaning {
  partOfSpeech: string;
  definition: string;
  example?: string;
}

export interface Definition {
  word: string;
  phonetic: string;
  meanings: Meaning[];
  fetchedAt?: string;
}

const vocabSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    word: { type: String, required: true },
    status: { type: String, default: 'learning' },
    seen: { type: Number, default: 1 },
    correct: { type: Number, default: 0 },
    lastSeen: { type: Date, default: Date.now },
  },
  { collection: 'vocab' },
);

vocabSchema.index({ userId: 1, word: 1 }, { unique: true });

const definitionSchema = new Schema(
  {
    word: { type: String, required: true, unique: true, index: true },
    phonetic: { type: String, default: '' },
    meanings: { type: Array, default: [] },
    fetchedAt: { type: Date, default: Date.now },
  },
  { collection: 'definitions' },
);

const VocabModel: Model<VocabEntry> =
  (mongoose.models.Vocab as Model<VocabEntry> | undefined) ??
  (mongoose.model('Vocab', vocabSchema) as unknown as Model<VocabEntry>);

const DefinitionModel: Model<Definition> =
  (mongoose.models.Definition as Model<Definition> | undefined) ??
  (mongoose.model('Definition', definitionSchema) as unknown as Model<Definition>);

function plain<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

export async function recordWord(userId: string, word: string, solved: boolean) {
  if (!(await connect())) return;

  await VocabModel.updateOne(
    { userId, word: word.toLowerCase() },
    {
      $inc: { seen: 1, correct: solved ? 1 : 0 },
      $set: { lastSeen: new Date() },
      $setOnInsert: { status: 'learning' },
    },
    { upsert: true },
  ).exec();
}

export async function setWordStatus(userId: string, word: string, status: WordStatus) {
  if (!(await connect())) return false;

  await VocabModel.updateOne(
    { userId, word: word.toLowerCase() },
    { $set: { status } },
  ).exec();

  return true;
}

export async function forgetWord(userId: string, word: string) {
  if (!(await connect())) return false;

  await VocabModel.deleteOne({ userId, word: word.toLowerCase() }).exec();
  return true;
}

export async function vocabCounts(userId: string) {
  if (!(await connect())) return { total: 0, learning: 0, known: 0 };

  const [total, known] = await Promise.all([
    VocabModel.countDocuments({ userId }).exec(),
    VocabModel.countDocuments({ userId, status: 'known' }).exec(),
  ]);

  return { total, learning: total - known, known };
}

export async function vocabPage(
  userId: string,
  status: WordStatus | 'all',
  page: number,
  size = 24,
) {
  if (!(await connect())) return { words: [] as VocabEntry[], total: 0, page: 1 };

  const filter = status === 'all' ? { userId } : { userId, status };
  const total = await VocabModel.countDocuments(filter).exec();
  const pages = Math.max(1, Math.ceil(total / size));
  const safe = Math.min(Math.max(1, page), pages);

  const docs = await VocabModel.find(filter)
    .sort({ lastSeen: -1 })
    .skip((safe - 1) * size)
    .limit(size)
    .lean<VocabEntry[]>()
    .exec();

  return { words: docs.map(plain), total, page: safe };
}

export async function wordToReview(userId: string): Promise<VocabEntry | null> {
  if (!(await connect())) return null;

  const doc = await VocabModel.findOne({ userId, status: 'learning' })
    .sort({ lastSeen: 1 })
    .lean<VocabEntry>()
    .exec();

  return doc ? plain(doc) : null;
}

const MAX_AGE_MS = 30 * 86_400_000;

export async function lookup(word: string): Promise<Definition | null> {
  const clean = word.trim().toLowerCase();
  if (!/^[a-z]{2,20}$/.test(clean)) return null;
  if (!(await connect())) return fetchDefinition(clean);

  const cached = await DefinitionModel.findOne({ word: clean }).lean<Definition>().exec();
  if (cached && Date.now() - new Date(cached.fetchedAt ?? 0).getTime() < MAX_AGE_MS) {
    return plain(cached);
  }

  const fresh = await fetchDefinition(clean);
  if (!fresh) return cached ? plain(cached) : null;

  await DefinitionModel.updateOne(
    { word: clean },
    { $set: { ...fresh, fetchedAt: new Date() } },
    { upsert: true },
  ).exec();

  return fresh;
}

interface ApiMeaning {
  partOfSpeech?: string;
  definitions?: { definition?: string; example?: string }[];
}

interface ApiEntry {
  word?: string;
  phonetic?: string;
  phonetics?: { text?: string }[];
  meanings?: ApiMeaning[];
}

async function fetchDefinition(word: string): Promise<Definition | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`, {
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const body = (await res.json()) as ApiEntry[];
    const entry = body?.[0];
    if (!entry) return null;

    const meanings: Meaning[] = [];

    for (const meaning of entry.meanings ?? []) {
      for (const sense of meaning.definitions ?? []) {
        if (!sense.definition) continue;

        meanings.push({
          partOfSpeech: meaning.partOfSpeech ?? '',
          definition: sense.definition,
          example: sense.example,
        });

        if (meanings.length >= 4) break;
      }
      if (meanings.length >= 4) break;
    }

    return {
      word,
      phonetic: entry.phonetic ?? entry.phonetics?.find((p) => p.text)?.text ?? '',
      meanings,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
