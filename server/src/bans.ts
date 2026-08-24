import type { Sanction } from './protocol.js';
import { internalSecret, webUrl } from './secret.js';

interface Enforced {
  reason: string;
  until: number | null;
}

let bans = new Map<string, Enforced>();
let warnings = new Map<string, Sanction>();
let lastFetch = 0;

const REFRESH_MS = 60_000;

export function isBanned(userId: string): Enforced | null {
  const ban = bans.get(userId);
  if (!ban) return null;

  if (ban.until !== null && ban.until <= Date.now()) {
    bans.delete(userId);
    return null;
  }

  return ban;
}

export function pendingWarning(userId: string) {
  return warnings.get(userId) ?? null;
}

export function clearWarning(userId: string) {
  warnings.delete(userId);
}

export async function refreshBans(force = false) {
  const secret = internalSecret();
  if (!secret) return;
  if (!force && Date.now() - lastFetch < REFRESH_MS) return;


  lastFetch = Date.now();

  try {
    const res = await fetch(`${webUrl()}/api/internal/sanctions`, {
      headers: { 'x-internal-secret': secret },
    });

    if (!res.ok) return;

    const body = (await res.json()) as {
      bans?: { userId: string; reason: string; until: number | null }[];
      warnings?: { userId: string; reason: string }[];
    };

    bans = new Map((body.bans ?? []).map((ban) => [ban.userId, { reason: ban.reason, until: ban.until }]));
    warnings = new Map(
      (body.warnings ?? []).map((warning) => [
        warning.userId,
        { kind: 'warn' as const, reason: warning.reason, until: null },
      ]),
    );
  } catch (err) {
    console.error('sanction refresh failed', (err as Error).message);
  }
}

export function bannedCount() {
  return bans.size;
}
