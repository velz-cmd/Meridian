import { NextResponse } from "next/server";
import { fetchTokenByAddress } from "@/lib/dexscreener";
import { buildResearchReport } from "@/lib/nexus-research";
import { buildTokenDossierPayload, resolveMultiTimeframeTa } from "@/lib/nexus-research-dossier";
import { buildDeskAgentSignal } from "@/lib/nexus-agent";
import { buildDeepTokenIntel } from "@/lib/deep-token-analysis";
import { fetchMergedTokenDetection } from "@/lib/token-detection";
import { fetchHolderCascade } from "@/lib/holder-fallback";
import { buildLocalTokenIntel } from "@/lib/token-intel-local";
import { getBirdeyePlan } from "@/lib/birdeye-policy";
import { isBirdeyeUsable } from "@/lib/birdeye-client";
import { dossierCacheKey, getDossierCache, setDossierCache } from "@/lib/dossier-cache";
import type { TrendingToken } from "@/lib/dexscreener";
import type { AgentSignal } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return handleTokenDossier(request);
}

function mergeIntelFromDetection(
  token: TrendingToken,
  detection: Awaited<ReturnType<typeof fetchMergedTokenDetection>>,
) {
  const local = buildLocalTokenIntel(token);
  const s = detection.summary as Record<string, unknown>;
  return {
    ...local,
    holderCount: (s.holderCount as number | undefined) ?? local.holderCount,
    buy24h: (s.buy24h as number | undefined) ?? local.buy24h,
    sell24h: (s.sell24h as number | undefined) ?? local.sell24h,
    whaleCount: detection.whales?.length ?? local.whaleCount,
  };
}

/** Feed default — holders, TA, traders in ~8–20s (no community/news/copy-trade). */
async function buildQuickFeedDossier(token: TrendingToken, tier: "feed" | "alpha") {
  const dexStats = {
    buys: token.txns24h?.buys ?? 0,
    sells: token.txns24h?.sells ?? 0,
    volume: token.volume24h,
  };
  const plan = getBirdeyePlan(tier, 0);
  const birdeyeMode =
    !isBirdeyeUsable() || plan.detection === "off"
      ? "off"
      : plan.detection === "full"
        ? "full"
        : "lite";

  const [detection, technicalBlocks, holderCascade] = await Promise.all([
    fetchMergedTokenDetection(token.tokenAddress, token.chainId, dexStats, { birdeyeMode }),
    resolveMultiTimeframeTa(token, { maxMs: 5_000 }),
    fetchHolderCascade(token.tokenAddress, token.chainId, { birdeyeMode: "off" }),
  ]);

  const intel = mergeIntelFromDetection(token, detection);
  const feedAgent = (token as TrendingToken & { agent?: AgentSignal }).agent;
  const agent: AgentSignal | undefined = feedAgent
    ? { ...feedAgent, reasoningFactors: feedAgent.reasoningFactors }
    : await buildDeskAgentSignal(token, intel);

  return buildTokenDossierPayload(token, {
    tier,
    intel,
    agent,
    detection,
    light: true,
    holderCascade,
    technicalBlocks,
  });
}

async function handleTokenDossier(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");
  const address = searchParams.get("address");
  const buys = Number(searchParams.get("buys") ?? 0);
  const sells = Number(searchParams.get("sells") ?? 0);
  const volume = Number(searchParams.get("volume") ?? 0);
  const tier = searchParams.get("tier") === "alpha" ? "alpha" : "feed";
  const full = searchParams.get("full") === "1";
  const quick = !full && (searchParams.get("quick") !== "0" || tier === "feed");

  if (!chainId || !address) {
    return NextResponse.json({ error: "chainId and address required" }, { status: 400 });
  }

  const cacheKey = dossierCacheKey(chainId, address, tier, quick);
  const cached = getDossierCache(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  try {
    const loaded = await fetchTokenByAddress(chainId, address);
    const token: TrendingToken = loaded
      ? { ...loaded, demoTradeable: true, suggestedNetwork: "arc" }
      : {
          symbol: searchParams.get("symbol") ?? "???",
          name: searchParams.get("name") ?? "Token",
          tokenAddress: address,
          chainId,
          pairAddress: searchParams.get("pair") ?? "",
          priceUsd: Number(searchParams.get("price") ?? 0),
          change24h: Number(searchParams.get("change24h") ?? 0),
          volume24h: volume,
          liquidityUsd: Number(searchParams.get("liquidity") ?? 0),
          url: `https://dexscreener.com/${chainId}/${address}`,
          txns24h: { buys, sells },
          demoTradeable: true,
          suggestedNetwork: "arc",
        };

    if (quick) {
      const payload = await buildQuickFeedDossier(token, tier);
      setDossierCache(cacheKey, payload);
      return NextResponse.json({ ...payload, mode: "quick" });
    }

    const dexStats = {
      buys: token.txns24h?.buys ?? buys,
      sells: token.txns24h?.sells ?? sells,
      volume: token.volume24h ?? volume,
    };

    const scanKind = tier === "alpha" ? "alpha" : "feed";
    const [bundle, detection] = await Promise.all([
      buildDeepTokenIntel(token, {
        scanKind,
        tokenIndex: 0,
        skipGmgnEnrich: false,
      }),
      fetchMergedTokenDetection(token.tokenAddress, token.chainId, dexStats),
    ]);

    const agent = await buildDeskAgentSignal(token, bundle.intel);
    const research = buildResearchReport({
      token,
      agent,
      intel: bundle.intel,
      technical: bundle.intel.technical,
      news: bundle.news,
      social: bundle.social,
    });

    const payload = await buildTokenDossierPayload(token, {
      tier,
      intel: bundle.intel,
      agent,
      community: bundle.community,
      news: bundle.news,
      research,
      detection,
    });

    setDossierCache(cacheKey, payload);
    return NextResponse.json({ ...payload, mode: "full" });
  } catch (error) {
    const loaded = await fetchTokenByAddress(chainId, address).catch(() => null);
    if (loaded && tier === "feed") {
      try {
        const fallback = await buildQuickFeedDossier(
          { ...loaded, demoTradeable: true, suggestedNetwork: "arc" },
          tier,
        );
        return NextResponse.json({
          ...fallback,
          mode: "quick-fallback",
          warning: error instanceof Error ? error.message : "Full dossier failed",
        });
      } catch {
        /* fall through */
      }
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dossier failed" },
      { status: 500 },
    );
  }
}
