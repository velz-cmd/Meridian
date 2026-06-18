/**
 * Canonical gate benchmark tokens — same CMC market row on /gate and /nexus.
 */
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { BSC_MAINNET_ANCHORS, type BscFeedAnchorSymbol } from "@/lib/bsc-feed-anchors";
import { BSC_MARKET_CHAIN_SLUG } from "@/lib/bsc-chain";
import { isGateSymbol } from "@/lib/gate-constants";
import { gateToAgentSignal } from "@/lib/gate-feed-sync";
import type { TokenIntel } from "@/lib/storage";

function norm(symbol: string): string {
  return symbol.replace(/^\$/, "").trim().toUpperCase();
}

/** Merge gate API + Dex search + static anchor into one display row. */
export async function fetchCanonicalGateBenchmarkToken(
  symbol: string,
): Promise<TrendingMarketToken | null> {
  const sym = norm(symbol);
  if (!isGateSymbol(sym)) return null;
  const anchor = BSC_MAINNET_ANCHORS[sym as BscFeedAnchorSymbol];

  try {
    const [gateRes, searchRes] = await Promise.all([
      fetch(`/api/gate/evaluate?symbol=${sym}`, { cache: "no-store" }),
      fetch(`/api/nexus/token/search?q=${encodeURIComponent(sym)}&chainId=${BSC_MARKET_CHAIN_SLUG}`, {
        cache: "no-store",
      }),
    ]);

    const gate = gateRes.ok ? await gateRes.json() : null;
    const search = searchRes.ok ? await searchRes.json() : null;
    const dex = (search?.results ?? []).find(
      (r: { symbol?: string; chainId?: string }) =>
        norm(r.symbol ?? "") === sym &&
        (String(r.chainId) === BSC_MARKET_CHAIN_SLUG || String(r.chainId) === "56"),
    );

    const agent =
      gate?.gate && gate?.skills
        ? gateToAgentSignal(sym, gate.gate, gate.skills.composite)
        : undefined;

    return mergeGateBenchmarkRow({
      symbol: sym,
      name: anchor.name,
      tokenAddress: dex?.tokenAddress ?? anchor.tokenAddress,
      chainId: String(dex?.chainId ?? BSC_MARKET_CHAIN_SLUG),
      pairAddress: dex?.pairAddress ?? "",
      priceUsd: gate?.market?.price ?? dex?.priceUsd ?? 0,
      change24h: gate?.market?.change24h ?? dex?.change24h ?? 0,
      volume24h: gate?.market?.volume24h ?? dex?.volume24h ?? 0,
      liquidityUsd: dex?.liquidityUsd ?? 0,
      marketCap: gate?.market?.marketCap ?? dex?.marketCap,
      icon: dex?.icon ?? anchor.icon,
      url: dex?.url ?? `https://dexscreener.com/bsc/${anchor.tokenAddress}`,
      agent,
      intel: gate?.skills
        ? ({
            gateSkills: gate.skills,
            gateFieldSources: gate.fieldSources,
            technical: {
              rsi: gate.market?.rsi,
              macdSignal: gate.market?.macdSignal,
            },
          } as unknown as TokenIntel)
        : undefined,
    });
  } catch {
    return null;
  }
}

export function mergeGateBenchmarkRow(
  token: TrendingMarketToken,
): TrendingMarketToken {
  const sym = norm(token.symbol);
  if (!isGateSymbol(sym)) return token;
  const anchor = BSC_MAINNET_ANCHORS[sym as BscFeedAnchorSymbol];

  return {
    ...token,
    symbol: sym,
    name: token.name || anchor.name,
    tokenAddress: token.tokenAddress || anchor.tokenAddress,
    chainId: token.chainId || BSC_MARKET_CHAIN_SLUG,
    icon: token.icon ?? anchor.icon,
    discoveryTag: token.discoveryTag ?? "BSC benchmark · CMC gate",
    sourceTags: [...new Set([...(token.sourceTags ?? []), "BSC", "CMC Gate", "Strategy Skill"])],
    demoTradeable: true,
    suggestedNetwork: "bsc",
  };
}

export function isGateBenchmarkRowComplete(token: TrendingMarketToken | null): boolean {
  if (!token) return false;
  return (
    token.priceUsd > 0 &&
    Boolean(token.icon) &&
    Boolean(token.pairAddress) &&
    Boolean(token.agent)
  );
}

/** Testnet swap token with mainnet gate market quote for sizing/display. */
export function overlayGateMarketOnDesk(
  desk: TrendingMarketToken,
  market: TrendingMarketToken,
): TrendingMarketToken {
  return {
    ...desk,
    name: market.name || desk.name,
    icon: market.icon ?? desk.icon,
    priceUsd: market.priceUsd > 0 ? market.priceUsd : desk.priceUsd,
    change24h: market.change24h ?? desk.change24h,
    volume24h: market.volume24h ?? desk.volume24h,
  };
}

export function findGateTokenInFeed(
  tokens: TrendingMarketToken[],
  symbol: string,
): TrendingMarketToken | undefined {
  const sym = norm(symbol);
  const hit = tokens.find((t) => norm(t.symbol) === sym);
  return hit ? mergeGateBenchmarkRow(hit) : undefined;
}
