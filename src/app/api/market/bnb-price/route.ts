import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Live BNB/USD for tBNB → token sizing (CoinMarketCap when configured, else Binance spot). */
export async function GET() {
  try {
    const { fetchLiveSnapshot } = await import("../../../../../bnb-hack/live/cmc-fetch.mjs");
    const snap = await fetchLiveSnapshot("BNB");
    if (snap.price && snap.price > 0) {
      return NextResponse.json(
        { symbol: "BNB", priceUsd: snap.price, change24h: snap.change24h ?? 0, source: "cmc" },
        { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
      );
    }
  } catch {
    /* fall through */
  }

  try {
    const res = await fetch("https://data-api.binance.vision/api/v3/ticker/price?symbol=BNBUSDT", {
      next: { revalidate: 30 },
    });
    const row = (await res.json()) as { price?: string };
    const priceUsd = Number(row.price);
    if (priceUsd > 0) {
      return NextResponse.json(
        { symbol: "BNB", priceUsd, change24h: 0, source: "binance" },
        { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
      );
    }
  } catch {
    /* ignore */
  }

  return NextResponse.json({ error: "BNB price unavailable" }, { status: 503 });
}
