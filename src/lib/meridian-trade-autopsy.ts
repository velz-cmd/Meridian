/**
 * Trade Autopsy — compare expected vs actual after closed trades.
 * Suggests improvements only — no automatic rule mutation.
 */
import type { GateJudgeConsensus } from "@/lib/gate-consensus-payload";
import type { MeridianSkillEvidence } from "@/lib/meridian-skill-evidence";
import type { MeridianTradeAutopsy } from "@/lib/meridian-intelligence-types";
import type { DemoTradeRecord } from "@/lib/demo-trading";

function pairTrades(trades: DemoTradeRecord[]): Array<{ buy: DemoTradeRecord; sell?: DemoTradeRecord }> {
  const bySymbol = new Map<string, DemoTradeRecord[]>();
  for (const t of trades) {
    const key = `${t.wallet}:${t.symbol}`;
    const list = bySymbol.get(key) ?? [];
    list.push(t);
    bySymbol.set(key, list);
  }

  const pairs: Array<{ buy: DemoTradeRecord; sell?: DemoTradeRecord }> = [];
  for (const list of bySymbol.values()) {
    const sorted = [...list].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    let openBuy: DemoTradeRecord | null = null;
    for (const t of sorted) {
      if (t.side === "buy") {
        openBuy = t;
      } else if (openBuy && (t.side === "sell" || t.side === "swap_to_usdc")) {
        pairs.push({ buy: openBuy, sell: t });
        openBuy = null;
      }
    }
    if (openBuy) pairs.push({ buy: openBuy });
  }
  return pairs;
}

function inferFailedSkills(
  evidence: MeridianSkillEvidence[],
  outcome: "win" | "loss" | "flat",
): { failed: string[]; passed: string[] } {
  const failed: string[] = [];
  const passed: string[] = [];
  for (const e of evidence) {
    const bearish = e.stance === "EXIT" || e.stance === "AVOID";
    const bullish = e.stance === "ENTER_LONG";
    if (outcome === "loss") {
      if (bullish && e.score >= 60) failed.push(e.skill);
      else if (bearish) passed.push(e.skill);
    } else if (outcome === "win") {
      if (bullish) passed.push(e.skill);
      else if (bearish && e.score >= 50) failed.push(e.skill);
    }
  }
  return { failed: failed.slice(0, 4), passed: passed.slice(0, 4) };
}

export function buildTradeAutopsies(input: {
  symbol: string;
  trades: DemoTradeRecord[];
  skillEvidence: MeridianSkillEvidence[];
  conviction: number;
  consensus: GateJudgeConsensus | null;
}): MeridianTradeAutopsy[] {
  const sym = input.symbol.toUpperCase();
  const relevant = input.trades.filter((t) => t.symbol.toUpperCase() === sym);
  if (!relevant.length) return [];

  return pairTrades(relevant)
    .slice(-5)
    .reverse()
    .map(({ buy, sell }) => {
      const pnl = sell?.pnlUsd ?? null;
      const outcome: MeridianTradeAutopsy["outcome"] =
        pnl == null ? "open" : pnl > 0.5 ? "win" : pnl < -0.5 ? "loss" : "flat";
      const { failed, passed } =
        outcome === "open"
          ? { failed: [], passed: [] }
          : inferFailedSkills(input.skillEvidence, outcome);

      const lesson =
        outcome === "open"
          ? "Position still open — autopsy runs after close."
          : outcome === "win"
            ? `Thesis held — ${passed.length ? passed.join(", ") : "constitution stack"} aligned with outcome.`
            : `Thesis failed — review ${failed.length ? failed.join(", ") : "risk/liquidity layers"}.`;

      const suggestedImprovement =
        failed.includes("Liquidity depth") || failed.includes("Volatility regime")
          ? "Consider tightening liquidity veto before entry in similar regimes."
          : failed.includes("Momentum")
            ? "Momentum layer may have been late — review RSI/MACD thresholds for this symbol."
            : "Review constitution articles triggered at entry vs exit — suggest manual rule review only.";

      return {
        tradeId: buy.id,
        symbol: sym,
        side: sell ? "round-trip" : "open-long",
        expectedConviction: input.conviction,
        actualPnlUsd: pnl,
        outcome,
        failedSkills: failed,
        passedSkills: passed,
        lesson,
        suggestedImprovement,
      };
    });
}
