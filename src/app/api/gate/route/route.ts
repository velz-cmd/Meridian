import { NextRequest, NextResponse } from "next/server";
import { buildGateRouteResponse } from "@/lib/gate-handler";
import type { AgentInput } from "@/lib/constitution-permit-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Rank BNB vs CAKE — where should an agent deploy BSC capital right now? */
export async function GET(req: NextRequest) {
  const agent: AgentInput = {
    action: (req.nextUrl.searchParams.get("agentAction") ?? "BUY") as AgentInput["action"],
    confidence: Number(req.nextUrl.searchParams.get("confidence") ?? 92),
    reasoning: "Agent requested via GET",
  };
  try {
    const payload = await buildGateRouteResponse({ agent });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Capital route failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { agent?: AgentInput };
    const payload = await buildGateRouteResponse({ agent: body.agent ?? null });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Capital route failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
