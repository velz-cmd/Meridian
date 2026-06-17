/**
 * Recommended GMGN skills for ARC autonomous agent (install on demand, in order).
 * Trading skills require GMGN_PRIVATE_KEY — use only after manual review.
 */

export type GmgnSkillTier = "brain" | "signals" | "execution" | "news" | "launch";

export const GMGN_AUTONOMOUS_STACK: {
  tier: GmgnSkillTier;
  order: number;
  skillIds: string[];
  why: string;
}[] = [
  {
    tier: "brain",
    order: 1,
    skillIds: [
      "gmgn-market",
      "gmgn-token",
      "gmgn-portfolio",
      "five-min-trending",
      "token-overview",
      "token-security-check",
      "smart-money-holders",
      "pump-fun-trending",
      "newly-created-tokens",
    ],
    why: "Feed Alpha Scan and token picks — trending, security, holders, KOL/smart money (read-only, API key only).",
  },
  {
    tier: "signals",
    order: 2,
    skillIds: [
      "gmgn-track",
      "smart-money-buy-signal",
      "kol-call-signal",
      "price-surge-signal",
      "newly-created-tokens",
    ],
    why: "Real-time monitors for autopilot triggers — when smart money or KOLs move, agent can react.",
  },
  {
    tier: "execution",
    order: 3,
    skillIds: [
      "gmgn-cooking",
      "buy-tp-sl",
      "trailing-stop-loss",
      "limit-buy",
      "limit-sell",
      "gmgn-swap",
    ],
    why: "Live on-chain execution on Sol/BSC/Base — needs private key. MERIDIAN demo trades settle on BSC Testnet.",
  },
  {
    tier: "news",
    order: 4,
    skillIds: ["opennews-mcp", "opentwitter-mcp"],
    why: "External 6551 MCP — wire separately in Cursor; not via GMGN API key alone.",
  },
];

export function recommendedSkillIds(): string[] {
  return GMGN_AUTONOMOUS_STACK.flatMap((s) => s.skillIds);
}
