export function Bars({
  data,
  label,
  empty,
}: {
  data: { key: string; value: number }[];
  label: string;
  empty: string;
}) {
  const peak = Math.max(1, ...data.map((point) => point.value));
  const total = data.reduce((sum, point) => sum + point.value, 0);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>

      {total === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {data.map((point) => (
            <div key={point.key} className="flex items-center gap-2">
              <span className="w-4 text-xs tabular-nums text-muted-foreground">{point.key}</span>
              <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
                <div
                  className="h-full rounded bg-primary/80"
                  style={{ width: `${Math.max(2, (point.value / peak) * 100)}%` }}
                />
              </div>
              <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">
                {point.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FormRow({ results }: { results: ('win' | 'loss' | 'draw')[] }) {
  if (results.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {results.map((result, index) => (
        <span
          key={index}
          className={
            result === 'win'
              ? 'flex h-6 w-6 items-center justify-center rounded bg-emerald-500/15 text-[10px] font-bold uppercase text-emerald-600'
              : result === 'loss'
                ? 'flex h-6 w-6 items-center justify-center rounded bg-red-500/15 text-[10px] font-bold uppercase text-red-500'
                : 'flex h-6 w-6 items-center justify-center rounded bg-muted text-[10px] font-bold uppercase text-muted-foreground'
          }
        >
          {result === 'win' ? 'W' : result === 'loss' ? 'L' : 'D'}
        </span>
      ))}
    </div>
  );
}
