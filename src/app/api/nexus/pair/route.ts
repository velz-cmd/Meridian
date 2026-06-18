import { NextResponse } from "next/server";
import { fetchTokenByAddress } from "@/lib/dexscreener";
import { BSC_CHAIN_ID, BSC_MARKET_CHAIN_SLUG } from "@/lib/bsc-chain";
import { BSC_MAINNET_ANCHORS } from "@/lib/bsc-feed-anchors";
import { isBscNativeBnb } from "@/lib/arc-usdc-swap";

export const dynamic = "force-dynamic";

function resolveMarketLookup(chainId: string, address: string): { chainId: string; address: string } {
  const addr = address.toLowerCase();
  if (String(chainId) === String(BSC_CHAIN_ID) || chainId === "bsc-testnet") {
    if (isBscNativeBnb(address)) {
      return { chainId: BSC_MARKET_CHAIN_SLUG, address: BSC_MAINNET_ANCHORS.BNB.tokenAddress };
    }
    const byDesk = Object.values(BSC_MAINNET_ANCHORS).find((a) => a.tokenAddress.toLowerCase() === addr);
    if (byDesk) return { chainId: BSC_MARKET_CHAIN_SLUG, address: byDesk.tokenAddress };
    return { chainId: BSC_MARKET_CHAIN_SLUG, address };
  }
  return { chainId, address };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");
  const address = searchParams.get("address");

  if (!chainId || !address) {
    return NextResponse.json({ error: "chainId and address required" }, { status: 400 });
  }

  try {
    const lookup = resolveMarketLookup(chainId, address);
    const pair = await fetchTokenByAddress(lookup.chainId, lookup.address);
    if (!pair?.pairAddress) {
      return NextResponse.json({ pairAddress: null, url: null });
    }
    return NextResponse.json(
      {
        symbol: pair.symbol,
        name: pair.name,
        icon: pair.icon,
        pairAddress: pair.pairAddress,
        url: pair.url,
        priceUsd: pair.priceUsd,
        change24h: pair.change24h,
        volume24h: pair.volume24h,
        liquidityUsd: pair.liquidityUsd,
        marketCap: pair.marketCap,
        fdv: pair.fdv,
        txns24h: pair.txns24h,
        priceChange: pair.priceChange,
        marketChainId: lookup.chainId,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pair lookup failed" },
      { status: 500 },
    );
  }
}
