import { NextResponse } from "next/server";
import { fetchTokenByAddress, type TrendingToken } from "@/lib/dexscreener";
import { fetchLiveDiscoveryFeed } from "@/lib/live-discovery-feed";
import { STABLE_FEED_LIMIT } from "@/lib/feed-config";
import {
  feedCacheKey,
  FEED_FULL_TTL_MS,
  FEED_QUICK_TTL_MS,
  getFeedCache,
  getStaleFeedCache,
  setFeedCache,
} from "@/lib/feed-cache";
import { filterLiveFeedTokens } from "@/lib/token-filters";
import { analyzeTrendingFeed, analyzeTrendingFeedQuick } from "@/lib/nexus-agent";
import { trendingToDemoToken } from "@/lib/demo-trading";
import { enrichTokensWithIcons } from "@/lib/token-icons";
import { mapWithConcurrency } from "@/lib/async-pool";
import { sanitizeAgentReasoningFactors } from "@/lib/reasoning-factors";
import { dedupeFeedTokens, discoveryHunterLabel } from "@/lib/feed-curation";
import { assessTokenScam } from "@/lib/scam-detection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

async function enrichMissingPairs(tokens: TrendingToken[], cap: number) {
  const missing = tokens
    .filter((t) => !t.pairAddress)
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, cap);

  if (missing.length === 0) return tokens;

  const resolved = await mapWithConcurrency(
    missing,
    async (t) => {
      const pair = await fetchTokenByAddress(t.chainId, t.tokenAddress);
      return pair ? { ...pair, intel: t.intel, demoTradeable: true, suggestedNetwork: "bsc" } : t;
    },
    6,
  );

  const byKey = new Map(resolved.map((t) => [`${t.chainId}:${t.tokenAddress.toLowerCase()}`, t]));
  return tokens.map((t) => byKey.get(`${t.chainId}:${t.tokenAddress.toLowerCase()}`) ?? t);
}

function buildFeedPayload(
  analyzed: Awaited<ReturnType<typeof analyzeTrendingFeed>>,
  mode: string,
  meta?: {
    profile?: string;
    sources?: Record<string, number>;
    gmgnErrors?: string[];
    gmgnFromCache?: boolean;
    gmgnSkillsRefreshed?: string[];
    dataPolicy?: string;
  },
) {
  const feed = dedupeFeedTokens(
    filterLiveFeedTokens(
    analyzed.map(({ token, intel, signal, security }) => {
      const scam = assessTokenScam(token, intel, security);
      return {
      ...trendingToDemoToken(token),
      discoveryTag: discoveryHunterLabel(token, { security, scam }),
      sourceTags: token.sourceTags,
      intel,
      agent: signal
        ? {
            ...signal,
            reasoningFactors: sanitizeAgentReasoningFactors(signal.reasoningFactors, 6),
          }
        : signal,
      security,
      updatedAt: new Date().toISOString(),
    };
    }),
    ),
  );

  const counts = {
    buy: feed.filter((t) => t.agent?.action === "BUY").length,
    sell: feed.filter((t) => t.agent?.action === "SELL").length,
    hold: feed.filter((t) => t.agent?.action === "HOLD").length,
  };

  return {
    mode,
    feedProfile: meta?.profile ?? "discovery-hunter",
    feedSources: meta?.sources,
    gmgnErrors: meta?.gmgnErrors,
    gmgnFromCache: meta?.gmgnFromCache,
    gmgnSkillsRefreshed: meta?.gmgnSkillsRefreshed,
    dataPolicy: meta?.dataPolicy ?? "live-reads-only",
    aiProvider: process.env.GROQ_API_KEY ? "groq" : process.env.OPENAI_API_KEY ? "openai" : "heuristic",
    settlement: "BSC Testnet tBNB",
    updatedAt: new Date().toISOString(),
    feedCycle: Math.floor(Date.now() / 45_000),
    refreshSeconds: 45,
    counts,
    tokens: feed,
  };
}

function feedResponse(payload: Record<string, unknown>, quick: boolean, cached: boolean) {
  const sMaxAge = quick ? 20 : 40;
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=60`,
      "X-Feed-Cache": cached ? "HIT" : "MISS",
    },
  });
}

const QUICK_BUILD_BUDGET_MS = 22_000;
const FEED_VERCEL_BUDGET_MS = 52_000;

async function buildFeed(
  quick: boolean,
  limit: number,
  opts?: { birdeyeCap?: number },
) {
  const discovery = await fetchLiveDiscoveryFeed(limit, { quick });
  let tokens = dedupeFeedTokens(discovery.tokens).slice(0, limit);
  if (tokens.length === 0) {
    const { fetchTrendingMarketTokens } = await import("@/lib/dexscreener");
    const { filterLiveFeedTokens } = await import("@/lib/token-filters");
    const raw = await fetchTrendingMarketTokens(limit * 2, { stable: true, discovery: true });
    tokens = filterLiveFeedTokens(dedupeFeedTokens(raw)).slice(0, limit);
  }
  const feedMeta = {
    profile: discovery.profile,
    sources: discovery.sources,
    gmgnErrors: discovery.gmgnErrors,
    gmgnFromCache: discovery.gmgnFromCache,
    gmgnSkillsRefreshed: discovery.gmgnSkillsRefreshed,
    dataPolicy: quick ? "dex-first-quick" : "live-reads-only",
  };
  tokens = await enrichTokensWithIcons(tokens, quick ? 3 : 8);
  if (!quick) tokens = await enrichMissingPairs(tokens, 6);
  tokens = filterLiveFeedTokens(tokens);

  const analyzed = quick
    ? await analyzeTrendingFeedQuick(tokens, {
        birdeyeCap: opts?.birdeyeCap ?? 0,
        skipGmgnSecurity: true,
        dexOnly: opts?.birdeyeCap === 0,
      })
    : await analyzeTrendingFeed(tokens);

  return buildFeedPayload(
    analyzed,
    quick ? "live-discovery-feed-quick" : "live-discovery-feed",
    feedMeta,
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const quick = searchParams.get("quick") === "1";
    const limit = Math.min(
      Number(searchParams.get("limit") ?? STABLE_FEED_LIMIT),
      quick ? 12 : STABLE_FEED_LIMIT,
    );
    const cacheKey = feedCacheKey(quick, limit);
    const ttl = quick ? FEED_QUICK_TTL_MS : FEED_FULL_TTL_MS;

    const fresh = getFeedCache(cacheKey, ttl);
    if (fresh) return feedResponse(fresh, quick, true);

    const stale = getStaleFeedCache(cacheKey);
    if (quick && stale) {
      try {
        const payload = await Promise.race([
          buildFeed(true, limit),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("quick_build_budget")), QUICK_BUILD_BUDGET_MS),
          ),
        ]);
        setFeedCache(cacheKey, payload);
        return feedResponse(payload, quick, false);
      } catch {
        if (stale) {
          return feedResponse(
            { ...stale, stale: true, refreshNote: "Cached feed — Dex data refreshing" },
            quick,
            true,
          );
        }
        try {
          const payload = await buildFeed(true, limit, { birdeyeCap: 0 });
          setFeedCache(cacheKey, payload);
          return feedResponse(
            { ...payload, refreshNote: "Dex-first feed — Birdeye enriching in background" },
            quick,
            false,
          );
        } catch {
          /* fall through to full build */
        }
      }
    }

    try {
      const payload = await Promise.race([
        buildFeed(quick, limit, quick ? { birdeyeCap: 0 } : undefined),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("feed_vercel_budget")), FEED_VERCEL_BUDGET_MS),
        ),
      ]);
      setFeedCache(cacheKey, payload);
      return feedResponse(payload, quick, false);
    } catch (buildErr) {
      const staleFallback = getStaleFeedCache(cacheKey);
      if (staleFallback) {
        return feedResponse(
          { ...staleFallback, stale: true, refreshNote: "Serving cache — live rebuild timed out" },
          quick,
          true,
        );
      }
      if (quick) {
        const payload = await buildFeed(true, limit, { birdeyeCap: 0 });
        setFeedCache(cacheKey, payload);
        return feedResponse(
          { ...payload, refreshNote: "Dex-first quick feed" },
          quick,
          false,
        );
      }
      throw buildErr;
    }
  } catch (error) {
    const { searchParams } = new URL(request.url);
    const quick = searchParams.get("quick") === "1";
    const limit = Math.min(
      Number(searchParams.get("limit") ?? STABLE_FEED_LIMIT),
      quick ? 12 : STABLE_FEED_LIMIT,
    );
    const stale = getStaleFeedCache(feedCacheKey(quick, limit));
    if (stale) {
      return feedResponse({ ...stale, stale: true }, quick, true);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Feed failed" },
      { status: 500 },
    );
  }
}
