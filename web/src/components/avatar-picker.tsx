'use client';

import { useState } from 'react';
import { AVATARS } from '@/lib/avatars';
import { Avatar } from '@/components/avatar';
import { cn } from '@/lib/utils';

export function AvatarPicker({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [selected, setSelected] = useState(defaultValue);

  return (
    <div>
      <input type="hidden" name={name} value={selected} />

      <div className="grid grid-cols-6 gap-2">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => setSelected(avatar.id)}
            aria-label={avatar.name}
            className={cn(
              'flex items-center justify-center rounded-lg p-1 transition-all',
              selected === avatar.id
                ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                : 'opacity-70 hover:opacity-100',
            )}
          >
            <Avatar id={avatar.id} size={34} />
          </button>
        ))}
      </div>
    </div>
  );
}
