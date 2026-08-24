'use client';

import { useEffect } from 'react';
import { useSocket } from '@/lib/socket';

interface TokenResponse {
  token: string | null;
  profile: { id: string; name: string; avatar: string };
}

export function Realtime({
  id,
  name,
  avatar,
}: {
  id: string;
  name: string;
  avatar: string;
}) {
  const connect = useSocket((s) => s.connect);

  useEffect(() => {
    let live = true;

    fetch('/api/game-token')
      .then((res) => (res.ok ? res.json() : null))
      .then((body: TokenResponse | null) => {
        if (!live) return;

        if (body?.profile) connect(body.profile, body.token);
        else connect({ id, name, avatar }, null);
      })
      .catch(() => {
        if (live) connect({ id, name, avatar }, null);
      });

    return () => {
      live = false;
    };
  }, [connect, id, name, avatar]);

  return null;
}
