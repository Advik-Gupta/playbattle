'use client';

import { useEffect } from 'react';
import { useSocket } from '@/lib/socket';

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
    connect({ id, name, avatar });
  }, [connect, id, name, avatar]);

  return null;
}
