import { NextRequest, NextResponse } from "next/server";
import { buildGateEvaluateResponse } from "@/lib/gate-handler";
import type { AgentInput } from "@/lib/constitution-permit-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Live CMC gate evaluation — BNB/CAKE only, no synthetic data. */
export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") ?? "BNB").toUpperCase();
  const agentAction = req.nextUrl.searchParams.get("agentAction");
  const agent: AgentInput | null = agentAction
    ? {
        action: agentAction as AgentInput["action"],
        confidence: Number(req.nextUrl.searchParams.get("confidence") ?? 85),
        reasoning: "Agent requested via GET",
      }
    : null;
  try {
    const payload = await buildGateEvaluateResponse({ symbol, agent });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gate evaluation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { symbol?: string; agent?: AgentInput };
    const symbol = String(body.symbol ?? "BNB").toUpperCase();
    const payload = await buildGateEvaluateResponse({ symbol, agent: body.agent ?? null });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gate evaluation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
