import { randomUUID } from 'node:crypto';
import { CHAT_HISTORY, CHAT_LIMIT, type ChatMessage } from './protocol.js';

const BLOCKED = [
  'shit',
  'fuck',
  'bitch',
  'bastard',
  'asshole',
  'dickhead',
  'wanker',
  'slut',
  'whore',
  'retard',
  'faggot',
  'nigger',
];

const WINDOW_MS = 10_000;
const MAX_PER_WINDOW = 6;

const rooms = new Map<string, ChatMessage[]>();
const rates = new Map<string, number[]>();

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[0@]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[4]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/[^a-z]/g, '');
}

export function isClean(text: string) {
  const flat = normalize(text);
  return !BLOCKED.some((word) => flat.includes(word));
}

export function mask(text: string) {
  return text
    .split(/(\s+)/)
    .map((part) => (isClean(part) ? part : '*'.repeat(part.length)))
    .join('');
}

export function allowed(userId: string) {
  const now = Date.now();
  const hits = (rates.get(userId) ?? []).filter((at) => now - at < WINDOW_MS);

  if (hits.length >= MAX_PER_WINDOW) {
    rates.set(userId, hits);
    return false;
  }

  hits.push(now);
  rates.set(userId, hits);
  return true;
}

export function addMessage(
  roomCode: string,
  message: Omit<ChatMessage, 'id' | 'at'>,
): ChatMessage {
  const full: ChatMessage = { ...message, id: randomUUID(), at: Date.now() };
  const log = rooms.get(roomCode) ?? [];

  log.push(full);
  if (log.length > CHAT_HISTORY) log.splice(0, log.length - CHAT_HISTORY);
  rooms.set(roomCode, log);

  return full;
}

export function systemMessage(roomCode: string, text: string) {
  return addMessage(roomCode, { userId: '', name: '', text, flagged: false, system: true });
}

export function history(roomCode: string) {
  return rooms.get(roomCode) ?? [];
}

export function clearRoom(roomCode: string) {
  rooms.delete(roomCode);
}

export function clean(text: string) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CHAT_LIMIT);
}
