import { NextResponse } from "next/server";
import { recordProductEvent, type ProductEventInput } from "@/lib/product-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_KINDS = new Set([
  "page_view",
  "gate_symbol",
  "gate_backtest",
  "gate_open_nexus",
  "nexus_wallet_connect",
  "nexus_wallet_disconnect",
  "nexus_trade",
  "prism_forecast",
  "analytics_refresh",
]);

async function parseTrackBody(request: Request): Promise<ProductEventInput | null> {
  const text = await request.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as ProductEventInput;
  } catch {
    return null;
  }
}

/** Ingest client + lightweight product events (beacon-friendly). */
export async function POST(request: Request) {
  try {
    const body = await parseTrackBody(request);
    if (!body?.visitor_id || !body.kind) {
      return NextResponse.json({ error: "visitor_id and kind required" }, { status: 400 });
    }
    if (body.visitor_id.length > 80 || body.kind.length > 64) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }

    const kind = body.kind.startsWith("api_") ? body.kind : body.kind;
    if (!ALLOWED_KINDS.has(kind) && !kind.startsWith("api_")) {
      return NextResponse.json({ error: "kind not allowed" }, { status: 400 });
    }

    const wallet =
      typeof body.meta?.wallet === "string" ? body.meta.wallet.toLowerCase().slice(0, 42) : null;

    await recordProductEvent({
      visitor_id: body.visitor_id,
      session_id: body.session_id,
      kind,
      path: body.path?.slice(0, 200) ?? null,
      action: wallet ?? body.action?.slice(0, 120) ?? null,
      symbol: body.symbol?.slice(0, 20) ?? null,
      meta: body.meta ?? {},
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "track failed" }, { status: 500 });
  }
}
