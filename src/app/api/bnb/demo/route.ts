import { NextRequest, NextResponse } from "next/server";
import { runBnbDemo } from "../../../../../bnb-hack/backtest/demo-runner.mjs";

export const runtime = "nodejs";

/** Fixture or live CMC demo (live when CMC_API_KEY set and ?live=1). */
export async function GET(req: NextRequest) {
  const live = req.nextUrl.searchParams.get("live") === "1";
  const symbol = (req.nextUrl.searchParams.get("symbol") ?? "BNB").toUpperCase();
  const hasKey = Boolean(process.env.CMC_API_KEY || process.env.CMC_PRO_API_KEY);

  try {
    const payload = await runBnbDemo({
      live: live && hasKey,
      symbol,
      days: 90,
    });
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Demo failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
