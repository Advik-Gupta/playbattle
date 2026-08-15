'use client';

import { useEffect } from 'react';
import { useSocket } from '@/lib/socket';

export function Realtime() {
  const connect = useSocket((s) => s.connect);

  useEffect(() => {
    connect();
  }, [connect]);

  return null;
}
