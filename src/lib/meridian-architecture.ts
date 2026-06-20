/**
 * MERIDIAN architecture map — CMC data → Skills → Reasoning → Output.
 * CMC provides raw materials; MERIDIAN provides intelligence.
 */

export type ArchitectureLayer = {
  id: string;
  label: string;
  source: "cmc" | "meridian" | "hybrid";
  items: string[];
  description: string;
};

export const MERIDIAN_ARCHITECTURE_LAYERS: ArchitectureLayer[] = [
  {
    id: "cmc-data",
    label: "CoinMarketCap APIs",
    source: "cmc",
    description: "Raw market materials — quotes, volume, macro, fear & greed, categories.",
    items: [
      "Price · OHLCV / quotes",
      "Volume · turnover",
      "Categories · tags",
      "Fear & Greed · historical",
      "Global metrics · BTC dominance",
      "Social / community proxies",
      "Trending · market cap rank",
    ],
  },
  {
    id: "skill-layer",
    label: "CMC Skill Layer (8 deterministic skills)",
    source: "cmc",
    description: "Backtestable, explainable rules — same logic in API, desk, and replay.",
    items: [
      "Momentum — RSI, MACD, F&G, ROC",
      "Trend alignment — 1h / 24h / 7d / 30d MTF",
      "Relative strength — vs BNB benchmark",
      "Liquidity depth — volume expansion, turnover",
      "Volatility — ATR squeeze / expansion",
      "Regime — bull / bear / risk-off / risk-on",
      "Sentiment divergence — price heat vs flow",
      "Structural quality — cap tier, rank, FDV",
    ],
  },
  {
    id: "reasoning",
    label: "MERIDIAN Reasoning",
    source: "meridian",
    description: "Architecture, not prompts — ensemble voting with adversarial debate.",
    items: [
      "Bull Court — momentum, RS, volume advocates",
      "Bear Court — overheating, vol, F&G extremes",
      "Constitution Engine — 6/9 votes, bear cap 15%",
      "Conviction scoring — weighted ensemble",
      "Capital router — BNB / CAKE / FLOKI / XVS rank",
    ],
  },
  {
    id: "memory",
    label: "MERIDIAN Memory Layer",
    source: "meridian",
    description: "Case-based reasoning on top of CMC snapshots — nobody else remembers.",
    items: [
      "Market Genome — daily encoded state",
      "Market Twin — historical analog % match",
      "Historical analog search — RSI, F&G, regime",
      "Trade DNA / Thesis DNA — setup fingerprint",
      "Market Memory — nearest genome relatives",
      "Market Replay — 90-day constitution backtest",
    ],
  },
  {
    id: "stress",
    label: "Stress & Time Intelligence",
    source: "meridian",
    description: "Recompute conviction under what-if scenarios — stress testing.",
    items: [
      "Counterfactual Engine — BTC −5%, vol collapse",
      "Conviction Decay — thesis half-life curve",
      "Time Machine — forward analog from backtest",
      "Trade Autopsy — expected vs actual (NEXUS)",
      "Evolution Engine — constitution mutations",
    ],
  },
  {
    id: "output",
    label: "Final Verdict",
    source: "hybrid",
    description: "Permit before wallet — GRANT / DENY with full audit trail.",
    items: [
      "Constitution permit",
      "Gate evaluate / route API",
      "NEXUS execution handoff",
      "Public analytics + Dune proof",
    ],
  },
];

/** Features the user asked about — mapped to implementation status */
export type FeatureCoverage = {
  id: string;
  name: string;
  cmcBacked: boolean;
  meridianLayer: boolean;
  status: "live" | "partial" | "planned";
  skillOrModule: string;
};

export const MERIDIAN_FEATURE_COVERAGE: FeatureCoverage[] = [
  { id: "structure", name: "Market structure (EMA/RSI/MACD/ATR)", cmcBacked: true, meridianLayer: false, status: "live", skillOrModule: "Momentum + Trend skills" },
  { id: "rs", name: "Relative strength vs BTC/BNB", cmcBacked: true, meridianLayer: false, status: "live", skillOrModule: "RS benchmark skill" },
  { id: "volume", name: "Volume intelligence", cmcBacked: true, meridianLayer: false, status: "live", skillOrModule: "Liquidity depth skill" },
  { id: "fg", name: "Fear & Greed + velocity", cmcBacked: true, meridianLayer: false, status: "live", skillOrModule: "Momentum + Regime skills" },
  { id: "sentiment", name: "Sentiment / social proxies", cmcBacked: true, meridianLayer: false, status: "live", skillOrModule: "Sentiment divergence skill" },
  { id: "category", name: "Category / narrative leadership", cmcBacked: true, meridianLayer: true, status: "live", skillOrModule: "Narrative Flow + capital router" },
  { id: "regime", name: "Market regime detection", cmcBacked: true, meridianLayer: false, status: "live", skillOrModule: "Regime detection skill" },
  { id: "breadth", name: "Market breadth", cmcBacked: true, meridianLayer: true, status: "live", skillOrModule: "Gate benchmark breadth %" },
  { id: "court", name: "Bull vs Bear Court", cmcBacked: false, meridianLayer: true, status: "live", skillOrModule: "9-layer judge consensus" },
  { id: "constitution", name: "Constitution Engine", cmcBacked: false, meridianLayer: true, status: "live", skillOrModule: "Permit + 6 articles" },
  { id: "twin", name: "Market Twin", cmcBacked: false, meridianLayer: true, status: "partial", skillOrModule: "Historical analog reference library" },
  { id: "analog", name: "Historical analog search", cmcBacked: false, meridianLayer: true, status: "partial", skillOrModule: "Genome similarity (reference)" },
  { id: "dna", name: "Trade / Thesis DNA", cmcBacked: false, meridianLayer: true, status: "partial", skillOrModule: "Thesis DNA panel (reference)" },
  { id: "decay", name: "Conviction decay", cmcBacked: false, meridianLayer: true, status: "live", skillOrModule: "Decay curve model" },
  { id: "counter", name: "Counterfactual engine", cmcBacked: false, meridianLayer: true, status: "partial", skillOrModule: "Gate re-eval stress (requires live baseline)" },
  { id: "replay", name: "Market replay / timeline", cmcBacked: true, meridianLayer: true, status: "live", skillOrModule: "90-day backtest + analog timeline slider" },
  { id: "autopsy", name: "Trade autopsy", cmcBacked: false, meridianLayer: true, status: "live", skillOrModule: "NEXUS trades + thesis snapshot at entry" },
];

export function summarizeArchitectureCoverage() {
  const live = MERIDIAN_FEATURE_COVERAGE.filter((f) => f.status === "live").length;
  const total = MERIDIAN_FEATURE_COVERAGE.length;
  const cmcSkills = 8;
  return {
    featureLive: live,
    featureTotal: total,
    cmcSkillCount: cmcSkills,
    coveragePct: Math.round((live / total) * 100),
    tagline: "CMC provides data · MERIDIAN provides reasoning",
  };
}
