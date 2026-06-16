import { NextRequest, NextResponse } from "next/server";
import {
  buildConstitutionResponse,
  deskOverlayFromBody,
  type AgentInput,
} from "@/lib/constitution-permit-handler";

export const runtime = "nodejs";

/**
 * MERIDIAN Constitution Permit — Track 2 runtime API.
 * Agents request a trade permit; constitution GRANTs or DENYs with receipt + counterfactual backtest.
 */
export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") ?? "BNB").toUpperCase();
  const agentAction = req.nextUrl.searchParams.get("agentAction") ?? "BUY";
  const agent: AgentInput = {
    action: agentAction as AgentInput["action"],
    confidence: Number(req.nextUrl.searchParams.get("confidence") ?? 85),
    reasoning: "Agent requested via GET demo",
  };
  try {
    const payload = await buildConstitutionResponse({ symbol, agent });
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Permit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const symbol = String(body.symbol ?? "BNB").toUpperCase();
    const agent = body.agent as AgentInput | undefined;
    const overlay = deskOverlayFromBody(body);
    const payload = await buildConstitutionResponse({ symbol, agent, overlay });
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Permit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
