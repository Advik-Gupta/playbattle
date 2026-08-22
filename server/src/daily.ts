import { WORDS } from './words.js';

export function dayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function hash(value: string) {
  let result = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }

  return result >>> 0;
}

export function wordForDay(day = dayKey()) {
  return WORDS[hash(day) % WORDS.length];
}

export function msUntilTomorrow(now = new Date()) {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}
