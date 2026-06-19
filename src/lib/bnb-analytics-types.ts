/** Public payload from GET /api/bnb/analytics */
export type BnbAnalyticsPayload = {
  brand: string;
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
  product: {
    configured: boolean;
    storage: "supabase" | "local" | "none";
    tableReady: boolean;
    siteLiveSince: string | null;
    visitors24h: number;
    visitors7d: number;
    visitorsAllTime: number;
    pageViews24h: number;
    pageViews7d: number;
    pageViewsAllTime: number;
    actions24h: number;
    actionsAllTime: number;
    activeVisitors1h: number;
    sessions24h: number;
    topPages: { path: string; views: number }[];
    topActions: { kind: string; count: number }[];
    hourlyPageViews: { hour: string; count: number }[];
    dailyTrend: Array<{
      date: string;
      pageViews: number;
      visitors: number;
      walletConnects: number;
      actions: number;
    }>;
    recent: Array<{
      at: string;
      kind: string;
      path: string | null;
      action: string | null;
      symbol: string | null;
      wallet: string | null;
      visitorShort: string;
    }>;
    wallets: {
      connectedAllTime: number;
      connected24h: number;
      connected7d: number;
      tradingWallets: number;
      vaultWallets: number;
      recentConnects: Array<{ wallet: string; at: string; path: string | null; connects: number }>;
    };
    allTime: {
      pageViews: number;
      visitors: number;
      actions: number;
      walletConnectEvents: number;
      trades: number;
      nexusDecisions: number;
      prismPredictions: number;
      gateApiCalls: number;
    };
    derived: {
      demoWallets: number;
      totalDemoTrades: number;
      nexusDecisions: number;
      prismPredictions: number;
    };
  };
  api: {
    evaluate: string;
    backtest: string;
    route: string;
    status: string;
    analytics: string;
  };
};
