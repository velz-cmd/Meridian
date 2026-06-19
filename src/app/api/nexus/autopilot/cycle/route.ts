import { NextResponse } from "next/server";
import { runAutopilotDeskCycle } from "@/lib/autopilot-desk-cycle";
import type { AutopilotVenue } from "@/lib/autopilot-desk-engine";
import { clampFuturesLeverage, clampSpotThesisLeverage } from "@/lib/nexus-autopilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Autonomous desk cycle — deterministic long/short/exit/hold from live market data.
 * GET /api/nexus/autopilot/cycle?symbol=BNB&venue=spot|futures&hasPosition=0|1
 *   &spotLev=1-5&futLev=1-20&marginPct=25
 *
 * Not a prediction API — applies CMC consensus, pulse, funding/OI rules.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "BNB").toUpperCase();
  const venueRaw = searchParams.get("venue") ?? "spot";
  const venue: AutopilotVenue = venueRaw === "futures" ? "futures" : "spot";
  const hasPosition = searchParams.get("hasPosition") === "1";
  const spotThesisLeverage = clampSpotThesisLeverage(Number(searchParams.get("spotLev") ?? 1));
  const futuresLeverage = clampFuturesLeverage(Number(searchParams.get("futLev") ?? 3));
  const marginPercent = Math.min(100, Math.max(5, Number(searchParams.get("marginPct") ?? 25) || 25));

  try {
    const cycle = await runAutopilotDeskCycle({
      symbol,
      venue,
      hasPosition,
      spotThesisLeverage,
      futuresLeverage,
      marginPercent,
    });
    const q = (extra: Record<string, string>) => {
      const p = new URLSearchParams({
        symbol,
        venue,
        hasPosition: hasPosition ? "1" : "0",
        spotLev: String(spotThesisLeverage),
        futLev: String(futuresLeverage),
        marginPct: String(marginPercent),
        ...extra,
      });
      return p.toString();
    };
    return NextResponse.json(
      {
        ...cycle,
        reproduce: {
          spot: `/api/nexus/autopilot/cycle?${q({ venue: "spot" })}`,
          futures: `/api/nexus/autopilot/cycle?${q({ venue: "futures" })}`,
          skills: `/api/gate/skills?symbol=${symbol}`,
          positionRoute: `/api/nexus/position-route?symbol=${symbol}&hasPosition=${hasPosition ? 1 : 0}`,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Autopilot desk cycle failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      symbol?: string;
      venue?: AutopilotVenue;
      hasPosition?: boolean;
      spotThesisLeverage?: number;
      futuresLeverage?: number;
      marginPercent?: number;
    };
    const cycle = await runAutopilotDeskCycle({
      symbol: body.symbol ?? "BNB",
      venue: body.venue ?? "spot",
      hasPosition: body.hasPosition ?? false,
      spotThesisLeverage: clampSpotThesisLeverage(body.spotThesisLeverage ?? 1),
      futuresLeverage: clampFuturesLeverage(body.futuresLeverage ?? 3),
      marginPercent: Math.min(100, Math.max(5, body.marginPercent ?? 25)),
    });
    return NextResponse.json(cycle, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Autopilot desk cycle failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
