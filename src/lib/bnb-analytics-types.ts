/** Public payload from GET /api/bnb/analytics */
export type BnbAnalyticsPayload = {
  product: string;
  track: string;
  generatedAt: string;
  live: {
    app: string;
    gate: string;
    nexus: string;
    analytics: string;
  };
  dune: {
    configured: boolean;
    dashboardUrl: string | null;
    embedUrl: string | null;
    queryIds: number[];
    metrics: Record<string, number | string | null>;
    recentTxRows: Array<Record<string, unknown>>;
    error?: string;
  };
  gate: {
    cmcLive: boolean;
    degraded: boolean;
    benchmarks: number;
    permitsClear: number;
    regime: string;
    fearGreed: number;
    primary: string;
    symbols: string[];
  };
  execution: {
    totalTrades: number;
    uniqueWallets: number;
    tradesLast24h: number;
    bscTestnetTrades: number;
    buyCount: number;
    sellCount: number;
    recent: Array<{
      symbol: string;
      side: string;
      wallet: string;
      at: string;
      txHash?: string;
      tradeNetwork: string;
    }>;
  };
  onChain: {
    chainId: number;
    explorer: string;
    vaultAddress: string | null;
    vaultConfigured: boolean;
    vaultTxCount: number | null;
    vaultBalanceTbnb: number | null;
    pancakeRouter: string;
    recentActivity: Array<{
      hash: string;
      blockNumber: number;
      from: string;
      to: string | null;
      valueTbnb: number;
      isPancakeRouter: boolean;
      explorerUrl: string;
    }>;
    scannedBlocks: number;
  };
  platform: {
    supabaseConfigured: boolean;
    nexusDecisions: number | null;
    prismPredictions: number | null;
  };
  api: {
    evaluate: string;
    backtest: string;
    route: string;
    status: string;
    analytics: string;
  };
};
