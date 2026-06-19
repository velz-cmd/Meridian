/** Reference library — historical analogs, narratives, constitution articles */

export type HistoricalAnalog = {
  id: string;
  label: string;
  period: string;
  regime: string;
  fearGreed: number;
  rsi: number;
  change7d: number;
  breadth: number;
  outcomes: Record<string, number>;
  differencesTemplate: string[];
  implication: string;
};

export const HISTORICAL_ANALOGS: HistoricalAnalog[] = [
  {
    id: "oct-2023",
    label: "October 2023 recovery",
    period: "Oct 2023",
    regime: "risk-off",
    fearGreed: 28,
    rsi: 42,
    change7d: -4.2,
    breadth: 38,
    outcomes: { BNB: 22, CAKE: 40, FLOKI: 55, XVS: 18 },
    differencesTemplate: ["Funding cooler today", "Sentiment weaker then", "Liquidity healthier now"],
    implication: "Post-fear rebound pattern — expect staged recovery if breadth improves.",
  },
  {
    id: "jan-2024",
    label: "January 2024 rotation",
    period: "Jan 2024",
    regime: "neutral",
    fearGreed: 52,
    rsi: 58,
    change7d: 6.1,
    breadth: 71,
    outcomes: { BNB: 14, CAKE: 28, FLOKI: 12, XVS: 22 },
    differencesTemplate: ["Funding hotter today", "Sentiment stronger", "Breadth weaker"],
    implication: "Rotation-led rally — higher volatility, leader-dependent returns.",
  },
  {
    id: "mar-2024",
    label: "March 2024 breadth expansion",
    period: "Mar 2024",
    regime: "risk-on",
    fearGreed: 78,
    rsi: 64,
    change7d: 11.3,
    breadth: 85,
    outcomes: { BNB: 18, CAKE: 35, FLOKI: 48, XVS: 26 },
    differencesTemplate: ["Fear & Greed lower today", "Volume expansion similar", "RS leader aligned"],
    implication: "Broad participation — favor relative-strength leaders.",
  },
  {
    id: "aug-2024",
    label: "August 2024 consolidation",
    period: "Aug 2024",
    regime: "neutral",
    fearGreed: 45,
    rsi: 48,
    change7d: -1.8,
    breadth: 55,
    outcomes: { BNB: 8, CAKE: 12, FLOKI: -5, XVS: 6 },
    differencesTemplate: ["Regime match", "Volatility elevated", "Narrative rotation slower"],
    implication: "Range-bound chop — constitution sizing rules matter most.",
  },
];

export const SYMBOL_NARRATIVES: Record<string, { narrative: string; bucket: string }> = {
  BNB: { narrative: "Infrastructure", bucket: "L1" },
  CAKE: { narrative: "DeFi", bucket: "DeFi" },
  FLOKI: { narrative: "Memes", bucket: "Memes" },
  XVS: { narrative: "DeFi", bucket: "DeFi" },
};

export const NARRATIVE_BUCKETS = ["AI", "Memes", "Gaming", "RWA", "DeFi", "L1"] as const;

export const MEMORY_GENOMES: Array<{
  id: string;
  label: string;
  regime: string;
  fearGreed: number;
  breadth: number;
  avgOutcomePct: number;
  winRatePct: number;
}> = [
  { id: "728", label: "Risk-off capitulation", regime: "risk-off", fearGreed: 22, breadth: 32, avgOutcomePct: 7.1, winRatePct: 73 },
  { id: "143", label: "Neutral rotation", regime: "neutral", fearGreed: 48, breadth: 58, avgOutcomePct: 5.2, winRatePct: 68 },
  { id: "512", label: "Breadth expansion", regime: "risk-on", fearGreed: 72, breadth: 81, avgOutcomePct: 11.0, winRatePct: 71 },
  { id: "618", label: "Volatility squeeze", regime: "neutral", fearGreed: 55, breadth: 62, avgOutcomePct: 4.8, winRatePct: 64 },
  { id: "892", label: "Meme-led sprint", regime: "risk-on", fearGreed: 68, breadth: 74, avgOutcomePct: 14.2, winRatePct: 58 },
  { id: "1143", label: "AI narrative lead", regime: "risk-on", fearGreed: 74, breadth: 82, avgOutcomePct: 11.0, winRatePct: 69 },
];

export const CONSTITUTION_ARTICLE_DEFS = [
  {
    id: "I",
    title: "Supermajority vote",
    rule: "Need 6/9 skill layers aligned for GRANT",
    check: (ctx: { longVotes: number; total: number }) => ctx.longVotes >= 6,
    detail: (ctx: { longVotes: number; total: number }) => `${ctx.longVotes}/${ctx.total} layers long`,
  },
  {
    id: "II",
    title: "Momentum subordinate to risk",
    rule: "Momentum cannot override risk-off regime without breadth confirmation",
    check: (ctx: { regime: string; breadth: number }) =>
      ctx.regime !== "risk-off" || ctx.breadth >= 45,
    detail: (ctx: { regime: string; breadth: number }) => `Regime ${ctx.regime} · breadth ${ctx.breadth}`,
  },
  {
    id: "III",
    title: "Bear influence cap",
    rule: "Bear weight capped at 15% in consensus",
    check: (ctx: { bearPct: number }) => ctx.bearPct <= 15,
    detail: (ctx: { bearPct: number }) => `Bear weight ${ctx.bearPct}%`,
  },
  {
    id: "IV",
    title: "Risk-off position sizing",
    rule: "Risk-off regime halves effective position size",
    check: (ctx: { regime: string }) => true,
    detail: (ctx: { regime: string }) =>
      ctx.regime === "risk-off" ? "Half size enforced" : "Full size allowed",
  },
  {
    id: "V",
    title: "Liquidity floor",
    rule: "Volume must support turnover vs market cap",
    check: (ctx: { liquidityOk: boolean }) => ctx.liquidityOk,
    detail: () => "Turnover vs market cap check",
  },
  {
    id: "VI",
    title: "Conviction decay review",
    rule: "Thesis must be re-reviewed after 48h if permit granted",
    check: () => true,
    detail: () => "Auto review window active",
  },
] as const;
