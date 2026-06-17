import { NextResponse } from "next/server";
import { getDemoPositions } from "@/lib/storage";
import { scoreConnectedWallet } from "@/lib/wallet-score";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const onArc = searchParams.get("onArc") === "true";
  const onBsc = searchParams.get("onBsc") === "true";

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const positions = await getDemoPositions(address);
  const score = scoreConnectedWallet({ address, positions, onArc, onBsc });

  return NextResponse.json(score);
}
