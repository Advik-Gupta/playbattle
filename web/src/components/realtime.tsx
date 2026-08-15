'use client';

import { useEffect } from 'react';
import { useSocket } from '@/lib/socket';

export function Realtime({ id, name }: { id: string; name: string }) {
  const connect = useSocket((s) => s.connect);

  useEffect(() => {
    connect({ id, name });
  }, [connect, id, name]);

  return null;
}
