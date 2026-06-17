import { NextResponse } from "next/server";
import { probeGateStatus } from "@/lib/gate-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await probeGateStatus();
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Status probe failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
