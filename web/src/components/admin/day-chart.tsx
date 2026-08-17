export function DayChart({ data }: { data: { day: string; count: number }[] }) {
  const peak = Math.max(1, ...data.map((point) => point.count));

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Games per day
      </p>

      <div className="mt-4 flex h-32 items-end gap-1">
        {data.map((point) => (
          <div key={point.day} className="group flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] tabular-nums text-muted-foreground opacity-0 group-hover:opacity-100">
              {point.count}
            </span>
            <div
              className="w-full rounded-t bg-primary/70"
              style={{ height: `${Math.max(2, (point.count / peak) * 100)}%` }}
            />
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
