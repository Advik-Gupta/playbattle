'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const KEY = 'playbattle-theme';
const VALUES = ['light', 'dark', 'system'] as const;

type Theme = (typeof VALUES)[number];

function read(): Theme {
  try {
    const stored = window.localStorage.getItem(KEY);
    return VALUES.includes(stored as Theme) ? (stored as Theme) : 'system';
  } catch {
    return 'system';
  }
}

function apply(theme: Theme) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  document.documentElement.classList.toggle('dark', dark);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = read();
    setTheme(current);
    apply(current);
    setReady(true);
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  function pick(next: Theme) {
    setTheme(next);
    apply(next);

    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      return;
    }
  }

  if (!ready) return <span className="h-8 w-8" />;

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => pick(theme === 'dark' ? 'light' : 'dark')}
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:block" />
    </button>
  );
}
