"use client";

type FieldSources = Record<string, string | number | null>;

const LABELS: Record<string, string> = {
  "coinmarketcap/quotes/latest": "CMC live quote",
  "coinmarketcap/fear-and-greed/latest": "CMC Fear & Greed",
  "computed-14d-from-cmc-historical-daily": "RSI from CMC daily bars",
  "derived-from-cmc-historical-daily": "MACD from CMC daily",
  "binance-spot-daily-14rsi": "RSI from Binance daily (venue)",
  "binance-spot-daily-derived": "MACD from Binance daily",
  "coinmarketcap/quotes-momentum-proxy": "⚠ momentum proxy (upgrade CMC or wait for venue)",
};

export function GateDataProvenance({ sources }: { sources?: FieldSources }) {
  if (!sources) return null;

  const rows = [
    { k: "Price / cap / volume", v: sources.price },
    { k: "Fear & Greed", v: sources.fearGreed },
    { k: "RSI (14)", v: sources.rsi },
    { k: "MACD", v: sources.macd },
  ].filter((r) => r.v != null);

  const proxy = String(sources.rsi ?? "").includes("proxy");

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Data provenance</p>
      <ul className="mt-2 space-y-1">
        {rows.map((r) => (
          <li key={r.k} className="flex flex-wrap justify-between gap-2 text-[11px]">
            <span className="text-white/55">{r.k}</span>
            <span className={String(r.v).includes("proxy") ? "text-amber-300/90" : "text-emerald-300/85"}>
              {LABELS[String(r.v)] ?? String(r.v)}
            </span>
          </li>
        ))}
      </ul>
      {proxy && (
        <p className="mt-2 text-[10px] text-amber-200/80">
          RSI proxy only used when CMC historical and Binance venue both unavailable — not shown in production for BNB/CAKE.
        </p>
      )}
    </div>
  );
}
