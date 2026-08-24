import jwt from 'jsonwebtoken';
import { AVATAR_IDS, DEFAULT_AVATAR_ID, type PlayerProfile } from './protocol.js';

interface Claims {
  sub?: string;
  name?: string;
  avatar?: string;
}

function clean(claims: Claims): PlayerProfile | null {
  if (typeof claims.sub !== 'string' || claims.sub.length === 0) return null;

  const avatar = typeof claims.avatar === 'string' ? claims.avatar : '';

  return {
    id: claims.sub,
    name: typeof claims.name === 'string' && claims.name ? claims.name.slice(0, 20) : 'player',
    avatar: (AVATAR_IDS as readonly string[]).includes(avatar) ? avatar : DEFAULT_AVATAR_ID,
  };
}

export function authEnforced() {
  return Boolean(process.env.GAME_JWT_SECRET?.trim());
}

export function identify(handshake: {
  token?: unknown;
  profile?: unknown;
}): { ok: true; profile: PlayerProfile } | { ok: false; error: string } {
  const secret = process.env.GAME_JWT_SECRET?.trim();

  if (secret) {
    if (typeof handshake.token !== 'string' || handshake.token.length === 0) {
      return { ok: false, error: 'missing game token' };
    }

    try {
      const claims = jwt.verify(handshake.token, secret) as Claims;
      const profile = clean(claims);

      if (!profile) return { ok: false, error: 'bad game token' };
      return { ok: true, profile };
    } catch {
      return { ok: false, error: 'game token expired or invalid' };
    }
  }

  const raw = handshake.profile;
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'missing profile' };

  const { id, name, avatar } = raw as Record<string, unknown>;
  const profile = clean({
    sub: typeof id === 'string' ? id : undefined,
    name: typeof name === 'string' ? name : undefined,
    avatar: typeof avatar === 'string' ? avatar : undefined,
  });

  if (!profile) return { ok: false, error: 'missing profile' };
  return { ok: true, profile };
}
