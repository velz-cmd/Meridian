/** Deterministic pseudocode lines — mirrors bnb-hack/engine/nexus-gate.mjs */

export const CHECK_PSEUDOCODE: Record<string, string> = {
  macro_fg: "fear_greed <= 85",
  momentum_band: "ch1 >= 4 || (ch24 >= -12 && ch24 <= 42) || flow >= 0.52",
  intraday: "!crime_dump && !pump_fade && ch1 >= -18",
  rsi: "35 <= rsi <= 72",
  macd: "macd != 'bearish' || ch24 < 15",
  turnover: "0.02 <= volume / market_cap <= turnover_max",
  flow: "buy_flow_ratio >= 0.52 || flow is None",
  holders: "top10_holder_pct < 72 || top10 == 0",
  structure: "!crime_dump && !pump_fade && !fake_moon",
};

export const EXIT_PSEUDOCODE: Record<string, string> = {
  exit_signal: "signal in ('EXIT', 'AVOID')",
  rsi_extreme: "rsi > 78",
  fg_extreme: "fear_greed > 88",
  drawdown: "change24h <= -18",
  agreement: "weighted_agreement(checks) < 0.45",
};

export type RuleCardKind = "entry" | "exit" | "filter";

export function checkRuleKind(id: string): RuleCardKind {
  if (id === "macro_fg" || id === "holders" || id === "structure" || id === "intraday") return "filter";
  return "entry";
}

export function buildStrategyPseudocode(
  symbol: string,
  checks: { id: string; pass: boolean; label: string }[],
  signal: string,
): string {
  const sym = symbol.toLowerCase();
  const lines = [
    `# MERIDIAN momentum constitution · ${symbol} · live CMC bar`,
    `# Signal: ${signal} · deterministic — same path as CLI backtest`,
    "",
    `def evaluate_${sym}(bar) -> str:`,
    "    checks = {",
    ...checks.map(
      (c) =>
        `        "${c.id}": ${c.pass},  # ${CHECK_PSEUDOCODE[c.id] ?? c.label}`,
    ),
    "    }",
    "    if not checks['structure'] or not checks['macro_fg']:",
    "        return 'AVOID'",
    "    if signal_tier(bar) in ('a', 'a-plus') and weighted_pass(checks) >= 0.72:",
    "        return 'ENTER_LONG'",
    "    return 'HOLD'",
  ];
  return lines.join("\n");
}
