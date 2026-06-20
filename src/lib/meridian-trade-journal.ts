/**
 * Trade Journal — accountable statistics from real closed trades + replay backtest.
 * Never fabricates accuracy; shows losses and skill reliability honestly.
 */
import type { DemoTradeRecord } from "@/lib/demo-trading";
import type { MeridianTradeAutopsy } from "@/lib/meridian-intelligence-types";

export type MeridianTradeJournal = {
  sampleSize: number;
  openPositions: number;
  winRatePct: number | null;
  avgWinnerPct: number | null;
  avgLoserPct: number | null;
  maxDrawdownPct: number | null;
  bestEnvironment: string | null;
  weakestEnvironment: string | null;
  mostReliableSkill: string | null;
  leastReliableSkill: string | null;
  replayWinRatePct: number | null;
  replayReturnPct: number | null;
  replayDrawdownPct: number | null;
  source: "wallet-trades" | "replay-only" | "insufficient-data";
  disclaimer: string;
};

function pairClosedPnls(trades: DemoTradeRecord[]): number[] {
  const byKey = new Map<string, DemoTradeRecord[]>();
  for (const t of trades) {
    const key = `${t.wallet}:${t.symbol}`;
    const list = byKey.get(key) ?? [];
    list.push(t);
    byKey.set(key, list);
  }
  const pnls: number[] = [];
  for (const list of byKey.values()) {
    const sorted = [...list].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    let openBuy: DemoTradeRecord | null = null;
    for (const t of sorted) {
      if (t.side === "buy") openBuy = t;
      else if (openBuy && (t.side === "sell" || t.side === "swap_to_usdc") && t.pnlUsd != null) {
        const entry = openBuy.usdcAmount || 1;
        pnls.push((t.pnlUsd / entry) * 100);
        openBuy = null;
      }
    }
  }
  return pnls;
}

function skillReliability(autopsies: MeridianTradeAutopsy[]): {
  most: string | null;
  least: string | null;
} {
  const wins = new Map<string, number>();
  const losses = new Map<string, number>();
  for (const a of autopsies) {
    if (a.outcome === "open") continue;
    for (const s of a.passedSkills) wins.set(s, (wins.get(s) ?? 0) + 1);
    for (const s of a.failedSkills) losses.set(s, (losses.get(s) ?? 0) + 1);
  }
  const skills = new Set([...wins.keys(), ...losses.keys()]);
  if (!skills.size) return { most: null, least: null };

  let best: { s: string; rate: number } | null = null;
  let worst: { s: string; rate: number } | null = null;
  for (const s of skills) {
    const w = wins.get(s) ?? 0;
    const l = losses.get(s) ?? 0;
    const total = w + l;
    if (total < 2) continue;
    const rate = w / total;
    if (!best || rate > best.rate) best = { s, rate };
    if (!worst || rate < worst.rate) worst = { s, rate };
  }
  return { most: best?.s ?? null, least: worst?.s ?? null };
}

function regimeFromSnapshot(trades: DemoTradeRecord[]): Map<string, number[]> {
  const byRegime = new Map<string, number[]>();
  for (const t of trades) {
    if (t.pnlUsd == null || t.side === "buy") continue;
    const regime = t.thesisSnapshot?.gateSignal?.includes("risk-off")
      ? "risk-off"
      : t.thesisSnapshot?.verdict === "GRANT"
        ? "risk-on"
        : "neutral";
    const list = byRegime.get(regime) ?? [];
    list.push(t.pnlUsd);
    byRegime.set(regime, list);
  }
  return byRegime;
}

export function buildTradeJournal(input: {
  symbol: string;
  trades: DemoTradeRecord[];
  autopsies: MeridianTradeAutopsy[];
  backtest?: {
    winRatePct?: number;
    totalReturnPct?: number;
    maxDrawdownPct?: number;
  } | null;
}): MeridianTradeJournal {
  const sym = input.symbol.toUpperCase();
  const relevant = input.trades.filter((t) => t.symbol.toUpperCase() === sym);
  const pnls = pairClosedPnls(relevant);
  const openPositions = Math.max(0, relevant.filter((t) => t.side === "buy").length - pnls.length);

  const winners = pnls.filter((p) => p > 0);
  const losers = pnls.filter((p) => p < 0);

  const skillStats = skillReliability(input.autopsies.filter((a) => a.symbol === sym));

  let bestEnvironment: string | null = null;
  let weakestEnvironment: string | null = null;
  const regimePnls = regimeFromSnapshot(relevant);
  if (regimePnls.size > 0) {
    const ranked = [...regimePnls.entries()]
      .map(([regime, vals]) => ({
        regime,
        avg: vals.reduce((s, v) => s + v, 0) / vals.length,
      }))
      .sort((a, b) => b.avg - a.avg);
    bestEnvironment = ranked[0]?.regime ?? null;
    weakestEnvironment = ranked[ranked.length - 1]?.regime ?? null;
  }

  const bt = input.backtest;
  const hasWallet = pnls.length >= 3;
  const source: MeridianTradeJournal["source"] = hasWallet
    ? "wallet-trades"
    : bt?.winRatePct != null
      ? "replay-only"
      : "insufficient-data";

  return {
    sampleSize: pnls.length,
    openPositions,
    winRatePct: pnls.length ? Math.round((winners.length / pnls.length) * 1000) / 10 : null,
    avgWinnerPct: winners.length
      ? Math.round((winners.reduce((s, p) => s + p, 0) / winners.length) * 10) / 10
      : null,
    avgLoserPct: losers.length
      ? Math.round((losers.reduce((s, p) => s + p, 0) / losers.length) * 10) / 10
      : null,
    maxDrawdownPct: bt?.maxDrawdownPct ?? null,
    bestEnvironment,
    weakestEnvironment,
    mostReliableSkill: skillStats.most,
    leastReliableSkill: skillStats.least,
    replayWinRatePct: bt?.winRatePct ?? null,
    replayReturnPct: bt?.totalReturnPct ?? null,
    replayDrawdownPct: bt?.maxDrawdownPct ?? null,
    source,
    disclaimer:
      "Accountability statistics from closed wallet trades and constitution replay — not guaranteed future performance. Losses are shown, never hidden.",
  };
}
