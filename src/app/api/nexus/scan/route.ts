import { NextResponse } from "next/server";
import { runAlphaScan } from "@/lib/nexus-agent";
import { fetchTokenByAddress } from "@/lib/dexscreener";
import { chainIdFromWallet } from "@/lib/swappable";
import { ALPHA_SCAN_LIMIT } from "@/lib/feed-config";
import {
  alphaScanCacheKey,
  getAlphaScanCache,
  setAlphaScanCache,
} from "@/lib/alpha-scan-cache";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleAlphaScan(request);
}

async function handleAlphaScan(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    walletChainId?: number;
    chain?: string;
    arcFeeTxHash?: string;
    mode?: "alpha";
    chainId?: string;
    tokenAddress?: string;
    liveFeedKeys?: string[];
    liveFeedSymbolKeys?: string[];
  };

  try {
    const preferredChain =
      body.chain ?? (body.walletChainId ? chainIdFromWallet(body.walletChainId) : undefined);

    let focusToken;
    if (body.chainId && body.tokenAddress) {
      focusToken = (await fetchTokenByAddress(body.chainId, body.tokenAddress)) ?? undefined;
    }
    const liveFeedKeys = body.liveFeedKeys ?? [];
    const liveFeedSymbolKeys = body.liveFeedSymbolKeys ?? [];
    const cacheKey = alphaScanCacheKey([...liveFeedKeys, ...liveFeedSymbolKeys]);
    const cached = getAlphaScanCache(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    const result = await runAlphaScan(ALPHA_SCAN_LIMIT, {
      preferredChain,
      focusToken,
      liveFeedKeys,
      liveFeedSymbolKeys,
    });
    setAlphaScanCache(cacheKey, result as Record<string, unknown>);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed";
    console.error("[nexus/scan]", message, error);
    return NextResponse.json(
      {
        error: message,
        hint: "Scan timed out or upstream data was slow — retry in a moment.",
      },
      { status: 500 },
    );
  }
}
