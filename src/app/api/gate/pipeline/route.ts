import { NextResponse } from "next/server";
import { buildGatePipelineResponse } from "@/lib/gate-handler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await buildGatePipelineResponse();
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Pipeline probe failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
