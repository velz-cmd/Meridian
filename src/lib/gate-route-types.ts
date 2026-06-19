/** Live capital router payload from /api/gate/route */
export type GateRoutePayload = {
  regime: string;
  fearGreed: number;
  directive: string;
  allocation: {
    primary: string;
    secondary: string | null;
    splitPrimaryPct: number;
    splitSecondaryPct: number;
  };
  ranked: {
    rank: number;
    symbol: string;
    conviction: number;
    permit: string;
    signal: string;
    tier: string;
    edge: number;
    checks: string;
    alignmentScore?: number | null;
    gaps?: string[];
    rationale?: string;
    price: number;
    change24h: number;
  }[];
};

export type GateBenchmarkFull = {
  symbol: string;
  cmcLive?: boolean;
  fieldSources?: Record<string, string | number | null>;
  oracle?: {
    priceUsd: number;
    pair: string;
    updatedAt: number;
    ageHours: number;
    stale: boolean;
    adapter: string;
    spaceId: string;
    cmcPriceUsd?: number;
    cmcDeltaPct?: number | null;
  } | null;
  gate: {
    signal: string;
    tier: string;
    regime?: string;
    thesis?: string;
    confidence?: number;
    edge?: number;
    checksPassed: number;
    checksTotal: number;
    gaps?: string[];
    checks?: { id: string; pass: boolean; weight: number; label: string }[];
  };
  market: {
    price: number;
    change24h: number;
    fearGreed?: number;
    rsi?: number;
    macdSignal?: string;
    marketCap?: number;
    volume24h?: number;
  };
  skills?: {
    momentum?: { signal?: string; metrics?: { rsi?: number; macd?: string } };
    sentiment?: { state?: string; signal?: string };
    regime?: { regime?: string; signal?: string };
    relativeStrength?: {
      role?: string;
      rotationScore?: number;
      signal?: string;
      metrics?: { rs24h?: number; rs7d?: number; benchmark?: string };
    };
    volatility?: { state?: string; signal?: string; squeeze?: boolean; expansion?: boolean };
    composite?: { signal?: string; alignmentScore?: number; thesis?: string; blockers?: string[] };
  };
  conviction?: number;
};

export type GateRouteResponse = {
  benchmarks?: GateBenchmarkFull[];
  route?: GateRoutePayload;
  error?: string;
};
