import { NextResponse } from "next/server";
import { buildMarketPulse } from "@/lib/market-pulse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toUpperCase() ?? undefined;
  try {
    const pulse = await buildMarketPulse(symbol);
    return NextResponse.json(pulse, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Market pulse failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
