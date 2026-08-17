let banned = new Set<string>();
let lastFetch = 0;

const REFRESH_MS = 60_000;

export function isBanned(userId: string) {
  return banned.has(userId);
}

export async function refreshBans(force = false) {
  const secret = process.env.INTERNAL_API_SECRET ?? '';
  if (!secret) return;
  if (!force && Date.now() - lastFetch < REFRESH_MS) return;

  const webUrl = process.env.WEB_APP_URL ?? 'http://localhost:3000';
  lastFetch = Date.now();

  try {
    const res = await fetch(`${webUrl}/api/internal/bans`, {
      headers: { 'x-internal-secret': secret },
    });

    if (!res.ok) return;

    const body = (await res.json()) as { banned?: string[] };
    banned = new Set(body.banned ?? []);
  } catch (err) {
    console.error('ban refresh failed', (err as Error).message);
  }
}

export function bannedCount() {
  return banned.size;
}
