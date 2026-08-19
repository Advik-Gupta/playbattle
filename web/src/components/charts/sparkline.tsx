export function Sparkline({
  points,
  height = 64,
  label,
}: {
  points: number[];
  height?: number;
  label: string;
}) {
  if (points.length < 2) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-3 text-sm text-muted-foreground">Not enough games yet.</p>
      </div>
    );
  }

  const width = 240;
  const peak = Math.max(...points);
  const floor = Math.min(...points);
  const span = Math.max(1, peak - floor);

  const coords = points.map((value, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((value - floor) / span) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const area = `M0,${height} L${coords.join(' L')} L${width},${height} Z`;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{points[points.length - 1]}</p>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 h-16 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
      >
        <path d={area} className="fill-primary/15" />
        <polyline
          points={coords.join(' ')}
          className="stroke-primary"
          fill="none"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
