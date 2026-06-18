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

export type GateBenchmarkPayload = {
  symbol: string;
  gate: {
    signal: string;
    tier: string;
    regime?: string;
    confidence?: number;
    edge?: number;
    checksPassed: number;
    checksTotal: number;
    gaps?: string[];
  };
  market: { price: number; change24h: number; fearGreed?: number };
  skills?: {
    composite?: { signal?: string; alignmentScore?: number; thesis?: string };
  };
};

export type GateRouteResponse = {
  benchmarks?: GateBenchmarkPayload[];
  route?: GateRoutePayload;
};
