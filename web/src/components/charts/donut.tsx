export function Donut({
  segments,
  label,
  center,
}: {
  segments: { value: number; className: string; name: string }[];
  label: string;
  center: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>

      <div className="mt-3 flex items-center gap-4">
        <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90" role="img" aria-label={label}>
          <circle cx="50" cy="50" r={radius} className="fill-none stroke-muted" strokeWidth="12" />

          {total > 0 &&
            segments.map((segment) => {
              const length = (segment.value / total) * circumference;
              const dash = `${length} ${circumference - length}`;
              const element = (
                <circle
                  key={segment.name}
                  cx="50"
                  cy="50"
                  r={radius}
                  className={`fill-none ${segment.className}`}
                  strokeWidth="12"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                />
              );

              offset += length;
              return element;
            })}
        </svg>

        <div className="flex-1 space-y-1">
          <p className="text-2xl font-semibold tabular-nums">{center}</p>
          {segments.map((segment) => (
            <p key={segment.name} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${segment.className.replace('stroke', 'bg')}`} />
              {segment.name} {segment.value}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
