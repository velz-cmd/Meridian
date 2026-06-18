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
    price: number;
    change24h: number;
  }[];
};

export type GateRouteResponse = {
  benchmarks?: unknown[];
  route?: GateRoutePayload;
};
