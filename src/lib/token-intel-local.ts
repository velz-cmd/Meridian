import type { TokenIntel } from "./storage";
import type { TrendingToken } from "./dexscreener";
import { computeTechnicalAnalysis, normalizePriceChanges } from "./technical-analysis";

/** DexScreener-only intel — no fabricated whale/sniper/holder counts */
export function buildLocalTokenIntel(token: TrendingToken): TokenIntel {
  const ta = computeTechnicalAnalysis(
    token.priceUsd,
    normalizePriceChanges(token.priceChange, token.change24h),
    token.volume24h,
    token.liquidityUsd,
  );

  return {
    marketCap: token.marketCap,
    fdv: token.fdv,
    technical: {
      rsi: ta.rsi,
      rsiSignal: ta.rsiSignal,
      macd: ta.macd,
      macdSignal: ta.macdSignal,
      trend: ta.trend,
      trendLine: ta.trendLine,
      score: ta.score,
      taSource: "dex-proxy",
    },
  };
}
