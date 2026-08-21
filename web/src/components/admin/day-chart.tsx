import type { DayPoint } from '@/lib/db';

const SERIES = [
  { key: 'wordbattle' as const, name: 'WordBattle', className: 'bg-primary/80' },
  { key: 'tictactoe' as const, name: 'Tic Tac Toe', className: 'bg-sky-500/70' },
];

export function DayChart({ data }: { data: DayPoint[] }) {
  const peak = Math.max(1, ...data.map((point) => point.matches));

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Matches per day
        </p>

        <div className="flex gap-3">
          {SERIES.map((series) => (
            <span key={series.key} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className={`h-2 w-2 rounded-sm ${series.className}`} />
              {series.name}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex h-32 items-end gap-1">
        {data.map((point) => (
          <div key={point.day} className="group flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] tabular-nums text-muted-foreground opacity-0 group-hover:opacity-100">
              {point.matches}
            </span>

            <div
              className="flex w-full flex-col-reverse overflow-hidden rounded-t"
              style={{ height: `${Math.max(2, (point.matches / peak) * 100)}%` }}
              title={`${point.day}: ${point.matches} matches, ${point.players} players`}
            >
              {SERIES.map((series) => {
                const value = point[series.key];
                if (value === 0) return null;

                return (
                  <div
                    key={series.key}
                    className={series.className}
                    style={{ height: `${(value / Math.max(1, point.matches)) * 100}%` }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.day.slice(5)}</span>
        <span>{data[data.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}

export function LineChart({
  data,
  label,
  pick,
}: {
  data: DayPoint[];
  label: string;
  pick: (point: DayPoint) => number;
}) {
  const values = data.map(pick);
  const peak = Math.max(1, ...values);
  const width = 240;
  const height = 72;

  const coords = values.map((value, index) => {
    const x = data.length > 1 ? (index / (data.length - 1)) * width : 0;
    const y = height - (value / peak) * (height - 10) - 5;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{values[values.length - 1] ?? 0}</p>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 h-18 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
      >
        <path d={`M0,${height} L${coords.join(' L')} L${width},${height} Z`} className="fill-primary/10" />
        <polyline
          points={coords.join(' ')}
          className="stroke-primary"
          fill="none"
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
