/** Judge-facing strategy copy — market data → rules, not indicator dashboards. */

export const GATE_STRATEGY_NAME = "MERIDIAN Momentum Constitution";
export const GATE_STRATEGY_TAGLINE =
  "CoinMarketCap market data → explicit entry/exit rules → reproducible backtest";

export const STRATEGY_ENTRY_RULES = [
  "Default position is FLAT — only enter when A or A+ tier clears.",
  "Momentum: 24h change in healthy swing band; 1h structure not collapsing.",
  "Macro: Fear & Greed index not in extreme greed (>85).",
  "Technicals: RSI between 35–72; MACD not bearish against tape.",
  "Liquidity: turnover (volume ÷ market cap) within sane bounds.",
  "Safety: no rug/pump-dump pattern flags on the bar.",
] as const;

export const STRATEGY_EXIT_RULES = [
  "Close to FLAT on EXIT or AVOID signal.",
  "Force exit when RSI > 78, Fear & Greed > 88, or 24h drawdown beyond −18%.",
  "De-risk when agreement score falls below 45% or structure checks fail.",
] as const;

export const STRATEGY_POSITION_RULES = [
  "One position per symbol; 100% notional on entry, 0% on flat.",
  "10 bps fee per side in backtest (configurable).",
  "No look-ahead — signals use same-bar CMC data only.",
] as const;

export function strategyPosition(signal: string): "LONG" | "FLAT" {
  return signal === "ENTER_LONG" ? "LONG" : "FLAT";
}

export function strategySignalLabel(signal: string): string {
  switch (signal) {
    case "ENTER_LONG":
      return "Enter long";
    case "EXIT":
      return "Exit to flat";
    case "AVOID":
      return "Avoid / stay flat";
    default:
      return "Hold flat";
  }
}

export const GITHUB_SKILL =
  "https://github.com/ibrahim0-cursor/cursor-arc-circle/tree/main/bnb-hack/skills/nexus-momentum-gate";
