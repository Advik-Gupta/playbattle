'use client';

import { useSocket, type ConnectionStatus as Status } from '@/lib/socket';
import { cn } from '@/lib/utils';

const labels: Record<Status, string> = {
  idle: 'connecting',
  connecting: 'connecting',
  online: 'online',
  offline: 'offline',
};

const dots: Record<Status, string> = {
  idle: 'bg-muted-foreground',
  connecting: 'bg-muted-foreground animate-pulse',
  online: 'bg-emerald-500',
  offline: 'bg-red-500',
};

export function ConnectionStatus() {
  const status = useSocket((s) => s.status);

  return (
    <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
      <span className={cn('h-2 w-2 rounded-full', dots[status])} />
      {labels[status]}
    </span>
  );
}
