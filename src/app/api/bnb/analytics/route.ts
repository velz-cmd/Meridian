import { NextResponse } from "next/server";
import { buildBnbAnalyticsPayload } from "@/lib/bnb-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public BNB Hack traction — gate scans, Chapel swaps, Dune metrics. */
export async function GET() {
  try {
    const payload = await buildBnbAnalyticsPayload();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analytics unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
