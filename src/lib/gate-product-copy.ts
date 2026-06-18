/** User-facing /gate copy — product tone, no hackathon or vendor labels. */

export const GATE_PRODUCT = {
  kicker: "MERIDIAN",
  title: "Momentum router",
  subtitle:
    "Autonomous scan of BSC leaders — ranked by rule checks, not hype. Pick a symbol, review the constitution, execute when cleared.",
  rankingTitle: "Today's ranking",
  rankingFlat: "No symbol clears entry rules — stay flat.",
  rankingActive: (primary: string, pct: number, secondary?: string, secPct?: number) =>
    secondary && secPct
      ? `Strongest setup: ${primary} (${pct}%) with ${secondary} (${secPct}%) as secondary`
      : `Strongest setup: ${primary} (${pct}% notional)`,
  rankingMeta: (long: number, flat: number, regime: string, fg: number) =>
    `${long} long · ${flat} flat · ${regime.replace(/-/g, " ")} tape · sentiment ${fg}`,
  continueTradable: (sym: string) => `Trade ${sym} · wallet tBNB`,
  continueResearch: (sym: string) => `Review ${sym}`,
  openExecution: "Open trade desk",
  docs: "Strategy docs",
  backtestTitle: "Historical replay",
  backtestSubtitle: (sym: string) => `90-day rule replay for ${sym} — run when you want proof, not on every page load.`,
  viewing: (sym: string) => `Selected · ${sym}`,
  selectedHeadline: (sym: string, signal: "LONG" | "FLAT", checks: string) =>
    `${sym} · ${signal} · ${checks}`,
} as const;

export function gateSymbolTradableOnTestnet(symbol: string): boolean {
  const s = symbol.replace(/^\$/, "").trim().toUpperCase();
  return s === "BNB" || s === "CAKE" || s === "BUSD" || s === "USDC";
}
