const serverUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'http://localhost:4000';

async function post(path: string, body: unknown) {
  const secret = process.env.INTERNAL_API_SECRET ?? '';
  if (!secret) return null;

  try {
    const res = await fetch(`${serverUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify(body),
    });

    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function syncBans(userId: string) {
  return post('/bans/sync', { userId });
}

export function announce(message: string) {
  return post('/announce', { message });
}
