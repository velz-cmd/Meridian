import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { resolveAgentVaultAddress } from "@/lib/agent-vault";
import { createCircleWallet, getCircleBalances, getCircleStatus } from "@/lib/circle";
import { getArcStatus } from "@/lib/arc";

export async function POST() {
  try {
    const circle = await createCircleWallet(randomUUID());
    const vault = resolveAgentVaultAddress();
    const address = vault.configured ? vault.address : circle.address;
    const balances = circle.walletId
      ? await getCircleBalances(circle.walletId)
      : { demo: true, balances: [{ currency: "USDC", amount: "0.00" }] };

    return NextResponse.json({
      ...circle,
      address,
      vaultSource: vault.source,
      balances,
      hint: vault.configured
        ? "Deposit tBNB on BSC Testnet to this address, then Sync deposits in Autopilot"
        : "Configure ARC_AGENT_PRIVATE_KEY on Vercel for a real agent vault address",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Wallet init failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const walletId = new URL(request.url).searchParams.get("walletId");
  if (walletId) {
    const balances = await getCircleBalances(walletId);
    return NextResponse.json(balances);
  }
  const arc = await getArcStatus();
  const circle = await getCircleStatus();
  const vault = resolveAgentVaultAddress();
  return NextResponse.json({ arc, circle, agentVault: vault });
}
