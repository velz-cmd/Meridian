import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import {
  BSC_CHAIN_ID,
  BSC_MARKET_CHAIN_SLUG,
  BSC_TESTNET_CAKE,
  BSC_TESTNET_WBNB,
} from "@/lib/bsc-chain";

/** BSC Testnet demo tokens for BNB Hack judges */
export const HACKATHON_DEMO_SYMBOLS = ["BNB", "CAKE"] as const;

const WBNB = BSC_TESTNET_WBNB;
const CAKE = BSC_TESTNET_CAKE;

export const HACKATHON_DEMO_TOKENS: TrendingMarketToken[] = [
  {
    symbol: "BNB",
    name: "BNB",
    tokenAddress: WBNB,
    chainId: String(BSC_CHAIN_ID),
    pairAddress: "",
    priceUsd: 0,
    change24h: 0,
    volume24h: 0,
    liquidityUsd: 0,
    url: `https://dexscreener.com/${BSC_MARKET_CHAIN_SLUG}/${WBNB}`,
    discoveryTag: "hackathon-demo",
    agent: {
      action: "BUY",
      confidence: 92,
      riskScore: 35,
      reasoning: "Hackathon demo — agent proposes tactical long on BNB.",
      whyAction: "Momentum + BSC flagship asset for judge walkthrough.",
      reasoningFactors: [],
    },
  },
  {
    symbol: "CAKE",
    name: "PancakeSwap",
    tokenAddress: CAKE,
    chainId: String(BSC_CHAIN_ID),
    pairAddress: "",
    priceUsd: 0,
    change24h: 0,
    volume24h: 0,
    liquidityUsd: 0,
    url: `https://dexscreener.com/${BSC_MARKET_CHAIN_SLUG}/${CAKE}`,
    discoveryTag: "hackathon-demo",
    agent: {
      action: "BUY",
      confidence: 78,
      riskScore: 42,
      reasoning: "Hackathon demo — secondary BSC token for constitution compare.",
      whyAction: "DEX ecosystem token on BSC Testnet demo desk.",
      reasoningFactors: [],
    },
  },
];

/** Fetch live DexScreener market row for BSC symbol (real prices, not placeholders). */
export async function hydrateTokenFromMarket(symbol: string): Promise<Partial<TrendingMarketToken> | null> {
  try {
    const res = await fetch(
      `/api/nexus/token/search?q=${encodeURIComponent(symbol)}&chainId=${BSC_MARKET_CHAIN_SLUG}`,
    );
    const data = await res.json();
    const row = (data.results ?? []).find(
      (r: { symbol?: string; chainId?: string }) =>
        r.symbol?.toUpperCase() === symbol.toUpperCase() &&
        (String(r.chainId) === BSC_MARKET_CHAIN_SLUG || String(r.chainId) === String(BSC_CHAIN_ID)),
    );
    if (!row?.priceUsd) return null;
    return {
      symbol: row.symbol,
      name: row.name,
      tokenAddress: row.tokenAddress,
      chainId: String(row.chainId),
      pairAddress: row.pairAddress,
      priceUsd: row.priceUsd,
      change24h: row.change24h ?? 0,
      volume24h: row.volume24h ?? 0,
      liquidityUsd: row.liquidityUsd ?? 0,
      url: row.url,
      icon: row.icon,
    };
  } catch {
    return null;
  }
}

export type HackathonDemoStep =
  | "idle"
  | "select-bnb"
  | "await-permit"
  | "show-constitution"
  | "show-trade-block"
  | "show-backtest"
  | "show-curl"
  | "done";

export const HACKATHON_DEMO_STEP_LABELS: Record<Exclude<HackathonDemoStep, "idle">, string> = {
  "select-bnb": "Selecting BNB on BSC Testnet…",
  "await-permit": "Issuing constitution permit via CMC…",
  "show-constitution": "Agent BUY → constitution GRANT/DENY",
  "show-trade-block": "Buy blocked when constitution DENYs",
  "show-backtest": "Counterfactual backtest proof",
  "show-curl": "Runtime API — copy curl for judges",
  done: "Demo complete",
};

export function buildPermitCurl(symbol: string, baseUrl = ""): string {
  const origin =
    baseUrl ||
    (typeof window !== "undefined" ? window.location.origin : "https://trader-arc.vercel.app");
  return `curl -X POST ${origin}/api/constitution/permit -H "Content-Type: application/json" -d '{"symbol":"${symbol.toUpperCase()}","agent":{"action":"BUY","confidence":92}}'`;
}

export function resolveHackathonToken(
  symbol: string,
  feedTokens: TrendingMarketToken[],
): TrendingMarketToken {
  const sym = symbol.toUpperCase();
  const fromFeed = feedTokens.find((t) => t.symbol.toUpperCase() === sym);
  if (fromFeed) {
    return {
      ...fromFeed,
      agent: HACKATHON_DEMO_TOKENS.find((d) => d.symbol === sym)?.agent ?? fromFeed.agent,
    };
  }
  return HACKATHON_DEMO_TOKENS.find((d) => d.symbol === sym) ?? HACKATHON_DEMO_TOKENS[0];
}

export function buildPermitReceipt(payload: {
  permit: unknown;
  counterfactual?: unknown;
  skillMeta?: unknown;
  dataSource?: string;
  cmcLive?: boolean;
  generatedAt?: string;
  api?: { curl?: string };
}): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      product: "MERIDIAN Constitution Permit",
      dataSource: payload.dataSource,
      cmcLive: payload.cmcLive,
      generatedAt: payload.generatedAt,
      skill: payload.skillMeta,
      permit: payload.permit,
      counterfactual: payload.counterfactual,
      api: payload.api,
    },
    null,
    2,
  );
}
