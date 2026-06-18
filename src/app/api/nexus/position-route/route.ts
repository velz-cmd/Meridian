import { NextResponse } from "next/server";
import { fetchBinanceDerivativesContext } from "@/lib/binance-derivatives-context";
import { buildMarketPulse } from "@/lib/market-pulse";
import { buildPositionRoute } from "@/lib/position-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "BNB").toUpperCase();
  const hasPosition = searchParams.get("hasPosition") === "1";
  const agent = searchParams.get("agent")?.toUpperCase();

  try {
    const [pulse, derivatives] = await Promise.all([
      buildMarketPulse(symbol),
      fetchBinanceDerivativesContext(symbol),
    ]);

    const agentAction =
      agent === "BUY" || agent === "SELL" || agent === "HOLD" ? (agent as "BUY" | "SELL" | "HOLD") : null;

    const route = buildPositionRoute({
      symbol,
      pulse,
      derivatives,
      agentAction,
      hasRiskPosition: hasPosition,
    });

    return NextResponse.json(route, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Position route failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
