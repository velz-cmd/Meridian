import { NextRequest, NextResponse } from "next/server";
import { buildGateRouteResponse } from "@/lib/gate-handler";
import type { AgentInput } from "@/lib/constitution-permit-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Rank BSC benchmarks — where should an agent deploy capital right now? */
export async function GET(req: NextRequest) {
  const agentAction = req.nextUrl.searchParams.get("agentAction");
  const agent: AgentInput | null = agentAction
    ? {
        action: agentAction as AgentInput["action"],
        confidence: Number(req.nextUrl.searchParams.get("confidence") ?? 85),
        reasoning: "Agent requested via GET",
      }
    : null;
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
