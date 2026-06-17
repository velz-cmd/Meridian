/** BNB Hack Track 2 — CMC-listed BSC benchmarks only (no meme / dex overlay). */
export const GATE_SYMBOLS = ["BNB", "CAKE"] as const;

export type GateSymbol = (typeof GATE_SYMBOLS)[number];

export function isGateSymbol(symbol: string): symbol is GateSymbol {
  return (GATE_SYMBOLS as readonly string[]).includes(symbol.toUpperCase());
}

export const GATE_SKILL_REPO =
  "https://github.com/ibrahim0-cursor/cursor-arc-circle/tree/main/bnb-hack/skills/nexus-momentum-gate";
