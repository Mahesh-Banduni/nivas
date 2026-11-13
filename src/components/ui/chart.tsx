import { cn } from "@/lib/cn";
import { monthLabel } from "@/lib/date";

export interface SeriesPoint {
  month: string;
  value: number;
}

function scalePoints(series: SeriesPoint[]) {
  const max = Math.max(...series.map((point) => point.value), 1);
  return series.map((point, index) => ({
    x: series.length === 1 ? 50 : (index / (series.length - 1)) * 100,
    y: 38 - (point.value / max) * 33,
    point,
  }));
}

/** Smooth path through points (Catmull-Rom → cubic bezier). */
function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return path;
}

const STROKES = {
  pine: "#22483B",
  clay: "#BC6134",
  gold: "#A8854C",
} as const;

export function AreaChart({
  series,
  tone = "pine",
  height = 180,
  showLabels = true,
  className,
}: {
  series: SeriesPoint[];
  tone?: keyof typeof STROKES;
  height?: number;
  showLabels?: boolean;
  className?: string;
}) {
  const points = scalePoints(series);
  const line = smoothPath(points);
  const area = `${line} L 100 40 L 0 40 Z`;
  const stroke = STROKES[tone];
  const gradientId = `area-${tone}`;
  const last = points[points.length - 1];

  return (
    <div className={cn("w-full", className)}>
      <div className="relative" style={{ height }}>
        <svg
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[8, 18, 28, 38].map((y) => (
            <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#E5DED1" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={area} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {last && (
          <span
            className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cream"
            style={{ left: `${last.x}%`, top: `${(last.y / 40) * 100}%`, background: stroke }}
          />
        )}
      </div>
      {showLabels && (
        <div className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.08em] text-muted">
          {series.map((point) => (
            <span key={point.month} className={series.length > 8 ? "hidden sm:block" : ""}>
              {monthLabel(point.month)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sparkline({
  values,
  tone = "pine",
  width = 84,
  height = 28,
}: {
  values: number[];
  tone?: keyof typeof STROKES;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => ({
    x: (index / Math.max(1, values.length - 1)) * width,
    y: height - (value / max) * (height - 4) - 2,
  }));
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      <path
        d={smoothPath(points)}
        fill="none"
        stroke={STROKES[tone]}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.85"
      />
      {points.length > 0 && (
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.2" fill={STROKES[tone]} />
      )}
    </svg>
  );
}

export function DistributionBars({
  items,
  formatValue,
}: {
  items: Array<{ label: string; value: number; meta?: string }>;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
            <span className="font-medium capitalize text-ink">{item.label}</span>
            <span className="text-muted">
              {item.meta ? `${item.meta} · ` : ""}
              {formatValue ? formatValue(item.value) : item.value}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-sand">
            <div
              className="h-full rounded-full bg-pine/70"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
