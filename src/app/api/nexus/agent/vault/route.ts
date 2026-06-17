import { NextResponse } from "next/server";
import {
  resolveAgentVaultAddress,
  scanVaultDeposits,
  verifyVaultDepositTx,
} from "@/lib/agent-vault";
import {
  creditAgentVault,
  getAgentVaultLedger,
  getVaultScanCursor,
  saveAgentVaultLedger,
  setVaultScanCursor,
} from "@/lib/storage";

export async function GET(request: Request) {
  const owner = new URL(request.url).searchParams.get("owner")?.trim();
  const vault = resolveAgentVaultAddress();

  if (!vault.configured) {
    return NextResponse.json({
      configured: false,
      address: null,
      source: vault.source,
      balanceUsdc: 0,
      message:
        "Set NEXT_PUBLIC_AGENT_VAULT_ADDRESS or ARC_AGENT_PRIVATE_KEY on Vercel so users get a real deposit address.",
    });
  }

  const ledger = owner ? await getAgentVaultLedger(owner) : null;

  return NextResponse.json({
    configured: true,
    address: vault.address,
    source: vault.source,
    balanceUsdc: ledger?.balanceUsdc ?? 0,
    totalDeposited: ledger?.totalDeposited ?? 0,
    totalSpent: ledger?.totalSpent ?? 0,
    deposits: ledger?.deposits?.slice(0, 8) ?? [],
    ownerWallet: owner?.toLowerCase(),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      owner?: string;
      action?: "sync" | "credit_tx";
      txHash?: string;
      circleUserId?: string;
    };

    const owner = body.owner?.trim();
    if (!owner || !owner.startsWith("0x")) {
      return NextResponse.json({ error: "owner wallet required" }, { status: 400 });
    }

    const vault = resolveAgentVaultAddress();
    if (!vault.configured) {
      return NextResponse.json(
        {
          error:
            "Agent vault not configured. Add ARC_AGENT_PRIVATE_KEY or NEXT_PUBLIC_AGENT_VAULT_ADDRESS in Vercel env.",
        },
        { status: 503 },
      );
    }

    let ledger = await getAgentVaultLedger(owner);

    if (body.action === "credit_tx" && body.txHash) {
      const verified = await verifyVaultDepositTx(owner, vault.address, body.txHash);
      if (!verified) {
        return NextResponse.json(
          {
            error:
              "Could not verify deposit. Send tBNB on BSC Testnet from your connected wallet to the vault address, wait for confirmation, then paste that tx hash. Must be the same wallet shown above.",
          },
          { status: 400 },
        );
      }
      ledger = await creditAgentVault(owner, verified.amountUsdc, body.txHash);
      return NextResponse.json({
        ok: true,
        vault: vault.address,
        source: vault.source,
        ledger,
        credited: verified.amountUsdc,
      });
    }

    const fromBlock = await getVaultScanCursor();
    const { deposits, scannedToBlock } = await scanVaultDeposits(
      owner,
      vault.address,
      ledger.creditedTxHashes,
      fromBlock,
    );

    for (const d of deposits) {
      ledger = await creditAgentVault(owner, d.amountUsdc, d.txHash);
    }

    await saveAgentVaultLedger({
      ...ledger,
      updatedAt: new Date().toISOString(),
    });
    await setVaultScanCursor(scannedToBlock);

    return NextResponse.json({
      ok: true,
      vault: vault.address,
      source: vault.source,
      ledger,
      newDeposits: deposits.length,
      scannedToBlock: scannedToBlock.toString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Vault sync failed" },
      { status: 500 },
    );
  }
}
