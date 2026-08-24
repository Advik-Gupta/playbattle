'use client';

import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { play, setSound, soundOn } from '@/lib/sound';

export function SoundToggle() {
  const [on, setOn] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOn(soundOn());
    setReady(true);
  }, []);

  if (!ready) return <span className="h-8 w-8" />;

  function toggle() {
    const next = !on;

    setOn(next);
    setSound(next);
    if (next) play('submit');
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={on ? 'Mute sounds' : 'Unmute sounds'}
      className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
    >
      {on ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
