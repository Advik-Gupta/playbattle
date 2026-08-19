import { avatarFor } from '@/lib/avatars';
import { cn } from '@/lib/utils';

const SHAPES: Record<string, React.ReactNode> = {
  circle: <circle cx="16" cy="16" r="7" />,
  square: <rect x="9" y="9" width="14" height="14" rx="3" />,
  diamond: <path d="M16 7 L25 16 L16 25 L7 16 Z" />,
  triangle: <path d="M16 8 L25 24 L7 24 Z" />,
  cross: <path d="M13 7 h6 v6 h6 v6 h-6 v6 h-6 v-6 h-6 v-6 h6 Z" />,
  rings: (
    <>
      <circle cx="16" cy="16" r="8" fill="none" strokeWidth="2.5" stroke="currentColor" />
      <circle cx="16" cy="16" r="3.5" />
    </>
  ),
};

export function Avatar({
  id,
  name,
  size = 36,
  className,
}: {
  id: string | null | undefined;
  name?: string;
  size?: number;
  className?: string;
}) {
  const preset = avatarFor(id);

  return (
    <span
      className={cn('inline-flex shrink-0 overflow-hidden rounded-full', className)}
      style={{ width: size, height: size }}
      title={name}
    >
      <svg viewBox="0 0 32 32" width={size} height={size} role="img" aria-label={name ?? preset.name}>
        <rect width="32" height="32" fill={preset.bg} />
        <g fill={preset.fg} color={preset.fg}>
          {SHAPES[preset.shape]}
        </g>
      </svg>
    </span>
  );
}
