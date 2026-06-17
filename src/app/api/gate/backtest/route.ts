import { NextRequest, NextResponse } from "next/server";
import { buildGateBacktestResponse } from "@/lib/gate-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Real CMC historical backtest — returns error if plan/key unavailable (no fixtures). */
export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") ?? "BNB").toUpperCase();
  const days = Math.min(365, Math.max(30, Number(req.nextUrl.searchParams.get("days") ?? 90)));

  try {
    const payload = await buildGateBacktestResponse({ symbol, days });
    const status = payload.ok ? 200 : payload.mode === "plan-limited" ? 503 : 503;
    return NextResponse.json(payload, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Backtest failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
