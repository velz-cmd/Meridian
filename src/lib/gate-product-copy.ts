/** User-facing /gate copy — product tone, no hackathon or vendor labels. */

import { hasChapelExecutionRoute } from "@/lib/chapel-execution-router";
import { isGateSymbol } from "@/lib/gate-constants";
import type { SpotDeskState } from "@/lib/meridian-desk-states";

export const GATE_PRODUCT = {
  kicker: "MERIDIAN",
  title: "Strategy skill desk",
  subtitle:
    "Live CMC market data → explainable intelligence → historical context → disciplined testnet execution when cleared.",
  trustHorizon:
    "Trust over 1,000 trades — not excitement on the next trade. WAIT and UNKNOWN are valid answers.",
  rankingTitle: "Today's ranking",
  rankingFlat: "No symbol clears entry rules — wait for edge.",
  rankingActive: (primary: string, pct: number, secondary?: string, secPct?: number) =>
    secondary && secPct
      ? `Strongest setup: ${primary} (${pct}%) with ${secondary} (${secPct}%) as secondary`
      : `Strongest setup: ${primary} (${pct}% notional)`,
  rankingMeta: (long: number, wait: number, regime: string, fg: number) =>
    `${long} accumulate · ${wait} wait · ${regime.replace(/-/g, " ")} tape · sentiment ${fg}`,
  continueTradable: (sym: string) => `Trade ${sym} · wallet tBNB`,
  continueResearch: (sym: string) => `Review ${sym}`,
  openExecution: "Open trade desk",
  docs: "Strategy docs",
  backtestTitle: "Historical replay",
  backtestSubtitle: (sym: string) => `90-day rule replay for ${sym} — run when you want proof, not on every page load.`,
  viewing: (sym: string) => `Selected · ${sym}`,
  selectedHeadline: (sym: string, state: SpotDeskState | "WAIT", checks: string) =>
    `${sym} · ${state} · ${checks}`,
} as const;

export function gateSymbolTradableOnTestnet(symbol: string): boolean {
  const s = symbol.replace(/^\$/, "").trim().toUpperCase();
  if (s === "BNB" || s === "CAKE" || s === "BUSD" || s === "USDC") return true;
  if (isGateSymbol(s)) return hasChapelExecutionRoute(s);
  return false;
}
