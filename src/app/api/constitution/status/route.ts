import { NextResponse } from "next/server";
import { probeConstitutionStatus } from "@/lib/constitution-permit-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** CMC health + skill metadata for BNB Hack judges */
export async function GET() {
  try {
    const payload = await probeConstitutionStatus();
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Status probe failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
