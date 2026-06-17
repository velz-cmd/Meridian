"use client";

type EquityPoint = { t: string | number; constitution: number; naive: number };

export function GateEquityChart({
  points,
  symbol,
}: {
  points: EquityPoint[];
  symbol: string;
}) {
  if (!points.length) return null;

  const w = 640;
  const h = 200;
  const pad = { t: 12, r: 12, b: 28, l: 44 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const allY = points.flatMap((p) => [p.constitution, p.naive]);
  const minY = Math.min(...allY, 0.92);
  const maxY = Math.max(...allY, 1.08);
  const yRange = maxY - minY || 0.1;

  const x = (i: number) => pad.l + (i / Math.max(points.length - 1, 1)) * innerW;
  const y = (v: number) => pad.t + innerH - ((v - minY) / yRange) * innerH;

  const line = (key: "constitution" | "naive") =>
    points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`)
      .join(" ");

  const baseline = y(1);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black/40 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-white/55">
          Equity curve · {symbol} · CMC daily bars (indexed to 1.0)
        </p>
        <div className="flex gap-3 text-[10px]">
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="h-0.5 w-4 bg-emerald-400" /> Constitution gate
          </span>
          <span className="flex items-center gap-1.5 text-rose-300/90">
            <span className="h-0.5 w-4 bg-rose-400/80" /> Naive momentum agent
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={`Equity curve for ${symbol}`}>
        <line x1={pad.l} y1={baseline} x2={w - pad.r} y2={baseline} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
        <text x={pad.l - 6} y={baseline + 4} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="10">
          1.0
        </text>
        <path d={line("naive")} fill="none" stroke="rgba(251,113,133,0.75)" strokeWidth="2" />
        <path d={line("constitution")} fill="none" stroke="rgba(52,211,153,0.95)" strokeWidth="2.5" />
        <text x={pad.l} y={h - 8} fill="rgba(255,255,255,0.3)" fontSize="10">
          start
        </text>
        <text x={w - pad.r} y={h - 8} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="10">
          now
        </text>
      </svg>
    </div>
  );
}
