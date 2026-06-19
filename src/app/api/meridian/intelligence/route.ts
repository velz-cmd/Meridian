import { NextRequest, NextResponse } from "next/server";
import { buildGateBacktestResponse, buildGateEvaluateResponse } from "@/lib/gate-handler";
import { extractJudgeConsensus } from "@/lib/gate-consensus-payload";
import { buildMeridianIntelligence } from "@/lib/meridian-intelligence";
import { evaluateAllGateBenchmarks } from "@/lib/gate-benchmark-cache";
import { trackServerProductEvent } from "@/lib/product-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Unified Market Memory Engine — twin, court, narrative, counterfactual, decay, constitution */
export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") ?? "BNB").toUpperCase();
  const withBacktest = req.nextUrl.searchParams.get("backtest") !== "0";

  try {
    trackServerProductEvent(req, "api_meridian_intelligence", { symbol });

    const [evalPayload, batch, backtest] = await Promise.all([
      buildGateEvaluateResponse({ symbol }),
      evaluateAllGateBenchmarks().catch(() => null),
      withBacktest ? buildGateBacktestResponse({ symbol, days: 90 }).catch(() => null) : Promise.resolve(null),
    ]);

    const ranked = batch?.bySym
      ? [...batch.bySym.entries()]
          .map(([sym, ev]) => ({
            symbol: sym,
            conviction: ev.gate?.confidence ?? 50,
            rsRole: (ev.skills as { relativeStrength?: { role?: string } })?.relativeStrength?.role,
          }))
          .sort((a, b) => (b.conviction ?? 0) - (a.conviction ?? 0))
      : [];

    const skills = evalPayload.skills as {
      composite?: {
        alignmentScore?: number;
        relativeStrength?: { role?: string };
        volatility?: { label?: string };
        liquidity?: { pass?: boolean };
      };
      regime?: { regime?: string };
      relativeStrength?: { role?: string };
      volatility?: { state?: string };
      liquidity?: { pass?: boolean };
    };

    const regime = skills?.regime?.regime ?? "neutral";

    const bt = backtest?.ok ? (backtest as { backtest?: { winRatePct?: number; totalReturnPct?: number; maxDrawdownPct?: number; roundTrips?: number }; compare?: { edge?: { returnDeltaPct?: number; drawdownSavedPct?: number } } }) : null;

    const intelligence = buildMeridianIntelligence({
      symbol,
      regime,
      market: evalPayload.market,
      gate: evalPayload.gate,
      skills,
      consensus: extractJudgeConsensus(evalPayload.skills),
      conviction: evalPayload.conviction,
      ranked,
      backtest: bt
        ? {
            winRatePct: bt.backtest?.winRatePct,
            totalReturnPct: bt.backtest?.totalReturnPct,
            maxDrawdownPct: bt.backtest?.maxDrawdownPct,
            roundTrips: bt.backtest?.roundTrips,
            compare: bt.compare,
          }
        : null,
    });

    return NextResponse.json(intelligence, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Intelligence failed" },
      { status: 500 },
    );
  }
}
