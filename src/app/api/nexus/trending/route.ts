import { NextResponse } from "next/server";
import { fetchTrendingMarketTokens } from "@/lib/dexscreener";
import { trendingToDemoToken } from "@/lib/demo-trading";

export async function GET() {
  try {
    const tokens = await fetchTrendingMarketTokens(12);
    return NextResponse.json({
      mode: "demo-testnet",
      settlement: "BSC Testnet tBNB",
      tokens: tokens.map((t) => {
        const { intel, ...token } = t as typeof t & { intel?: unknown };
        return { ...trendingToDemoToken(token), intel };
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Trending fetch failed" },
      { status: 500 },
    );
  }
}
