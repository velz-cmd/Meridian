"use client";

type FieldSources = Record<string, string | number | null>;

type OraclePayload = {
  priceUsd: number;
  pair: string;
  updatedAt: number;
  ageHours: number;
  stale: boolean;
  adapter: string;
  spaceId: string;
  cmcPriceUsd?: number;
  cmcDeltaPct?: number | null;
};

const LABELS: Record<string, string> = {
  "coinmarketcap/quotes/latest": "CMC live quote",
  "coinmarketcap/fear-and-greed/latest": "CMC Fear & Greed",
  "computed-14d-from-cmc-historical-daily": "RSI from CMC daily bars",
  "derived-from-cmc-historical-daily": "MACD from CMC daily",
  "binance-spot-daily-14rsi": "RSI from Binance daily (venue)",
  "binance-spot-daily-derived": "MACD from Binance daily",
  "boracle-bsc-testnet/feed-adapter": "Boracle on-chain (BSC testnet)",
};

function fmtUsd(n: number) {
  return n < 1 ? `$${n.toFixed(6)}` : `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function GateDataProvenance({
  sources,
  oracle,
}: {
  sources?: FieldSources;
  oracle?: OraclePayload | null;
}) {
  if (!sources && !oracle) return null;

  const rows = [
    { k: "Price / cap / volume", v: sources?.price },
    { k: "Fear & Greed", v: sources?.fearGreed },
    { k: "RSI (14)", v: sources?.rsi },
    { k: "MACD", v: sources?.macd },
    ...(oracle
      ? [
          {
            k: `Oracle ${oracle.pair}`,
            v: `${fmtUsd(oracle.priceUsd)} · ${oracle.stale ? "stale" : "on-chain"} · ${oracle.ageHours}h ago`,
          },
        ]
      : []),
    ...(oracle?.cmcDeltaPct != null
      ? [{ k: "CMC vs oracle", v: `${oracle.cmcDeltaPct >= 0 ? "+" : ""}${oracle.cmcDeltaPct}%` }]
      : []),
  ].filter((r) => r.v != null);

  const proxy = String(sources?.rsi ?? "").includes("proxy");

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Data provenance</p>
      <ul className="mt-2 space-y-1">
        {rows.map((r) => (
          <li key={r.k} className="flex flex-wrap justify-between gap-2 text-[11px]">
            <span className="text-white/55">{r.k}</span>
            <span
              className={
                String(r.v).includes("proxy") || String(r.v).includes("stale")
                  ? "text-amber-300/90"
                  : "text-emerald-300/85"
              }
            >
              {LABELS[String(r.v)] ?? String(r.v)}
            </span>
          </li>
        ))}
      </ul>
      {oracle && (
        <p className="mt-2 text-[10px] text-white/45">
          Boracle testnet adapter{" "}
          <a
            href={`https://testnet.bscscan.com/address/${oracle.adapter}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300/80 underline"
          >
            {oracle.adapter.slice(0, 10)}…
          </a>
          {oracle.stale && " — last on-chain update is old; strategy uses live CMC, oracle shown for execution cross-check."}
        </p>
      )}
      {proxy && (
        <p className="mt-2 text-[10px] text-amber-200/80">
          RSI proxy only when CMC historical and Binance venue both unavailable.
        </p>
      )}
    </div>
  );
}
