/**
 * Live market pulse — aggregates CMC + macro into agent stance (long / flat / de-risk).
 * Cascade stress proxies leverage flush events (e.g. liquidation cascades) from real tape moves.
 */

import { getMacroRegime, type MacroRegime } from "./macro-regime";

export type CascadeLevel = "normal" | "elevated" | "extreme";

export type AgentMarketStance = "LONG" | "FLAT" | "DE_RISK";

export type MarketPulseFactor = {
  label: string;
  value: string;
  impact: "bullish" | "bearish" | "neutral";
};

export type MarketPulse = {
  ok: boolean;
  generatedAt: string;
  /** 0–100 — higher = more leverage/cascade stress on the tape */
  stressScore: number;
  cascadeLevel: CascadeLevel;
  /** Rough 60m notional proxy from mcap × hourly move — not a third-party liquidation feed */
  flushProxyUsd60m: number | null;
  flushProxyLabel: string;
  fearGreed: number | null;
  btcChange24h: number | null;
  marketCapChange24h: number | null;
  btcDominance: number | null;
  macro: MacroRegime | null;
  agentStance: AgentMarketStance;
  agentDirective: string;
  headline: string;
  factors: MarketPulseFactor[];
  dataSources: string[];
  /** When symbol provided — gate signal overlay */
  symbol?: string;
  gateSignal?: string;
  gateTier?: string;
};

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(Math.max(n, lo), hi);
}

/** Estimate 60m leverage flush notional from global mcap + hourly BTC shock. */
function estimateFlushProxy60m(
  totalMarketCapUsd: number | null,
  btcChange1h: number | null,
  btcChange24h: number | null,
): number | null {
  if (!totalMarketCapUsd || totalMarketCapUsd <= 0) return null;
  const h1 = btcChange1h ?? (btcChange24h != null ? btcChange24h / 24 : 0);
  const shock = Math.abs(h1);
  if (shock < 0.15) return null;
  // ~8–15% of shocked mcap notional often reprices in sharp leverage events (heuristic proxy)
  const leverageMult = shock > 2 ? 0.14 : shock > 1 ? 0.1 : 0.06;
  return Math.round(totalMarketCapUsd * (shock / 100) * leverageMult);
}

export function computeMarketPulse(input: {
  fearGreed?: number | null;
  btcChange24h?: number | null;
  btcChange1h?: number | null;
  marketCapChange24h?: number | null;
  totalMarketCapUsd?: number | null;
  btcDominance?: number | null;
  macro?: MacroRegime | null;
  gateSignal?: string | null;
  gateTier?: string | null;
  symbol?: string;
}): MarketPulse {
  const fg = input.fearGreed ?? 50;
  const btc24 = input.btcChange24h ?? 0;
  const btc1 = input.btcChange1h ?? btc24 / 24;
  const mcapCh = input.marketCapChange24h ?? 0;
  const macro = input.macro ?? null;

  let stress = 0;
  if (Math.abs(btc1) >= 1.5) stress += 18;
  if (Math.abs(btc1) >= 3) stress += 22;
  if (Math.abs(btc24) >= 4) stress += 15;
  if (mcapCh <= -2) stress += 18;
  if (mcapCh <= -4) stress += 12;
  if (fg <= 30) stress += 14;
  if (fg <= 20) stress += 10;
  if (macro?.label === "risk-off") stress += 12;
  if (btc1 < -2 && btc24 < 0) stress += 15;
  stress = clamp(stress, 0, 100);

  let cascadeLevel: CascadeLevel = "normal";
  if (stress >= 68 || (btc1 <= -2.5 && mcapCh <= -2.5)) cascadeLevel = "extreme";
  else if (stress >= 42 || (btc1 <= -1.2 && mcapCh <= -1.5)) cascadeLevel = "elevated";

  const flushProxyUsd60m = estimateFlushProxy60m(
    input.totalMarketCapUsd ?? null,
    input.btcChange1h ?? null,
    input.btcChange24h ?? null,
  );

  const gateSignal = input.gateSignal ?? null;
  const gateLong = gateSignal === "ENTER_LONG";

  let agentStance: AgentMarketStance = "FLAT";
  if (cascadeLevel === "extreme" || gateSignal === "EXIT" || gateSignal === "AVOID") {
    agentStance = "DE_RISK";
  } else if (gateLong && cascadeLevel === "normal") {
    agentStance = "LONG";
  } else if (gateLong && cascadeLevel === "elevated" && fg <= 85) {
    agentStance = "LONG";
  } else if (cascadeLevel === "elevated" || (macro?.label === "risk-off" && !gateLong)) {
    agentStance = "DE_RISK";
  }

  let agentDirective: string;
  if (agentStance === "LONG") {
    agentDirective =
      "Agent may open tactical long when constitution GRANTs — size small, trail invalidation on 1h roll-over.";
  } else if (agentStance === "DE_RISK") {
    agentDirective =
      cascadeLevel === "extreme"
        ? "Block new longs. Agent should HOLD or EXIT — cascade stress on tape."
        : "Defensive mode — no new size until stress fades; favor exits over entries.";
  } else {
    agentDirective = "Stay flat — gather more alignment before agent sizes in.";
  }

  const flushPart =
    flushProxyUsd60m != null && flushProxyUsd60m >= 5_000_000
      ? ` · est. ${fmtUsd(flushProxyUsd60m)} leverage flush proxy (60m)`
      : "";

  const headline =
    cascadeLevel === "extreme"
      ? `Cascade stress extreme — de-risk longs${flushPart}`
      : cascadeLevel === "elevated"
        ? `Leverage stress elevated${flushPart}`
        : gateLong
          ? `Tape supports selective longs · F&G ${fg}`
          : `Neutral tape · agent flat until gate clears`;

  const factors: MarketPulseFactor[] = [
    {
      label: "Fear & Greed",
      value: String(Math.round(fg)),
      impact: fg > 70 ? "bearish" : fg < 35 ? "bearish" : fg >= 45 && fg <= 65 ? "bullish" : "neutral",
    },
    {
      label: "BTC 1h",
      value: `${btc1 >= 0 ? "+" : ""}${btc1.toFixed(2)}%`,
      impact: btc1 > 0.5 ? "bullish" : btc1 < -0.8 ? "bearish" : "neutral",
    },
    {
      label: "BTC 24h",
      value: `${btc24 >= 0 ? "+" : ""}${btc24.toFixed(2)}%`,
      impact: btc24 > 1 ? "bullish" : btc24 < -2 ? "bearish" : "neutral",
    },
    {
      label: "Mcap 24h",
      value: `${mcapCh >= 0 ? "+" : ""}${mcapCh.toFixed(2)}%`,
      impact: mcapCh > 0 ? "bullish" : mcapCh < -1.5 ? "bearish" : "neutral",
    },
    {
      label: "Stress",
      value: `${stress}/100`,
      impact: stress >= 55 ? "bearish" : stress <= 25 ? "bullish" : "neutral",
    },
  ];

  if (gateSignal) {
    factors.push({
      label: input.symbol ? `${input.symbol} gate` : "Gate",
      value: gateSignal.replace(/_/g, " "),
      impact: gateLong ? "bullish" : gateSignal === "EXIT" || gateSignal === "AVOID" ? "bearish" : "neutral",
    });
  }

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    stressScore: stress,
    cascadeLevel,
    flushProxyUsd60m,
    flushProxyLabel: "CMC global mcap × hourly BTC shock (heuristic proxy — not WatcherGuru)",
    fearGreed: input.fearGreed ?? null,
    btcChange24h: input.btcChange24h ?? null,
    marketCapChange24h: input.marketCapChange24h ?? null,
    btcDominance: input.btcDominance ?? null,
    macro,
    agentStance,
    agentDirective,
    headline,
    factors,
    dataSources: [
      "coinmarketcap/fear-and-greed",
      "coinmarketcap/global-metrics",
      "coingecko/global",
      ...(input.gateSignal ? ["meridian/gate-engine"] : []),
    ],
    symbol: input.symbol,
    gateSignal: gateSignal ?? undefined,
    gateTier: input.gateTier ?? undefined,
  };
}

/** Server-side aggregator — pulls live feeds then scores pulse. */
export async function buildMarketPulse(symbol?: string): Promise<MarketPulse> {
  const macro = await getMacroRegime();

  let fearGreed: number | null = null;
  let btcChange1h: number | null = null;
  let btcChange24h = macro?.btcChange24h ?? null;
  let marketCapChange24h = macro?.marketCapChange24h ?? null;
  let totalMarketCapUsd: number | null = null;
  let btcDominance: number | null = null;
  let gateSignal: string | null = null;
  let gateTier: string | null = null;

  try {
    const { fetchGlobalMacro } = await import("../../bnb-hack/live/cmc-fetch.mjs");
    const global = await fetchGlobalMacro();
    if (global && typeof global === "object") {
      marketCapChange24h = global.totalMarketChange24h ?? marketCapChange24h;
      totalMarketCapUsd = global.totalMarketCap ?? null;
      btcDominance = global.btcDominance ?? null;
    }
  } catch {
    /* CMC optional */
  }

  try {
    const { evaluateAllGateBenchmarks } = await import("@/lib/gate-benchmark-cache");
    const sym =
      symbol && ["BNB", "CAKE", "FLOKI", "XVS"].includes(symbol.toUpperCase()) ? symbol.toUpperCase() : "BNB";
    const batch = await evaluateAllGateBenchmarks();
    const ev = batch.bySym.get(sym);
    const snap = ev?.snapshot as { fearGreed?: number; change1h?: number; change24h?: number } | undefined;
    if (snap) {
      fearGreed = snap.fearGreed ?? fearGreed;
      btcChange1h = snap.change1h ?? btcChange1h;
      if (sym === "BNB") {
        btcChange24h = snap.change24h ?? btcChange24h;
      }
    }
  } catch {
    /* fallback below */
  }

  if (symbol) {
    try {
      const { fetchGateRoutePayload } = await import("./gate-pulse-bridge");
      const row = await fetchGateRoutePayload(symbol);
      if (row) {
        gateSignal = row.gate.signal;
        gateTier = row.gate.tier;
        fearGreed = row.market.fearGreed ?? fearGreed;
      }
    } catch {
      /* optional gate overlay */
    }
  }

  return computeMarketPulse({
    fearGreed,
    btcChange24h,
    btcChange1h,
    marketCapChange24h,
    totalMarketCapUsd,
    btcDominance,
    macro,
    gateSignal,
    gateTier,
    symbol: symbol?.toUpperCase(),
  });
}

/** Autopilot / agent: should block a new long on this pulse? */
export function pulseBlocksLong(pulse: MarketPulse): boolean {
  return pulse.agentStance === "DE_RISK" && pulse.cascadeLevel !== "normal";
}

/** Map pulse + token agent signal → executable side for autopilot */
export function pulseAdjustAgentAction(
  pulse: MarketPulse,
  agentAction: "BUY" | "SELL" | "HOLD",
): "BUY" | "SELL" | "HOLD" {
  if (pulseBlocksLong(pulse) && agentAction === "BUY") return "HOLD";
  if (pulse.cascadeLevel === "extreme" && agentAction === "BUY") return "HOLD";
  if (pulse.agentStance === "DE_RISK" && pulse.cascadeLevel === "elevated" && agentAction === "BUY") {
    return "HOLD";
  }
  if (pulse.cascadeLevel === "extreme" && agentAction === "HOLD") return "SELL";
  return agentAction;
}
