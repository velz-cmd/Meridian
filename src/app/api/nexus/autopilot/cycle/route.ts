import { NextResponse } from "next/server";
import { runAutopilotDeskCycle } from "@/lib/autopilot-desk-cycle";
import type { AutopilotVenue } from "@/lib/autopilot-desk-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Autonomous desk cycle — deterministic long/short/exit/hold from live market data.
 * GET /api/nexus/autopilot/cycle?symbol=BNB&venue=spot|futures&hasPosition=0|1
 *
 * Not a prediction API — applies CMC consensus, pulse, funding/OI rules.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "BNB").toUpperCase();
  const venueRaw = searchParams.get("venue") ?? "spot";
  const venue: AutopilotVenue = venueRaw === "futures" ? "futures" : "spot";
  const hasPosition = searchParams.get("hasPosition") === "1";

  try {
    const cycle = await runAutopilotDeskCycle({ symbol, venue, hasPosition });
    return NextResponse.json(
      {
        ...cycle,
        reproduce: {
          spot: `/api/nexus/autopilot/cycle?symbol=${symbol}&venue=spot&hasPosition=${hasPosition ? 1 : 0}`,
          futures: `/api/nexus/autopilot/cycle?symbol=${symbol}&venue=futures&hasPosition=${hasPosition ? 1 : 0}`,
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
    };
    const cycle = await runAutopilotDeskCycle({
      symbol: body.symbol ?? "BNB",
      venue: body.venue ?? "spot",
      hasPosition: body.hasPosition ?? false,
    });
    return NextResponse.json(cycle, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Autopilot desk cycle failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
