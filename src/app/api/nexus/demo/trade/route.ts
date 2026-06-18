import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { applyDemoTrade, buildDemoQuote, type DemoTradeSide } from "@/lib/demo-trading";
import { demoNetworkById, type DemoTradeNetworkId } from "@/lib/testnet-chains";
import { debitAgentVault, getAgentVaultLedger, getDemoPositions, saveDemoTrade } from "@/lib/storage";
import { getBscPublicClient, isBscTxHash } from "@/lib/bsc-chain";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      wallet: string;
      side: DemoTradeSide;
      symbol: string;
      tokenAddress: string;
      sourceChain: string;
      tradeNetwork: DemoTradeNetworkId;
      usdcAmount?: number;
      tokenAmount?: number;
      priceUsd: number;
      arcFeeTxHash: string;
      useAgentVault?: boolean;
      /** Set when trade is part of an authorized autopilot session (reuses one arcFeeTxHash) */
      autopilotSession?: boolean;
    };

    if (!body.wallet || !body.arcFeeTxHash) {
      return NextResponse.json({ error: "wallet and arcFeeTxHash required" }, { status: 400 });
    }

    if (!isBscTxHash(body.arcFeeTxHash)) {
      return NextResponse.json(
        { error: "arcFeeTxHash must be a valid BSC Testnet transaction hash (not a wallet signature)" },
        { status: 400 },
      );
    }

    try {
      const receipt = await getBscPublicClient().getTransactionReceipt({
        hash: body.arcFeeTxHash as `0x${string}`,
      });
      if (!receipt || receipt.status !== "success") {
        return NextResponse.json({ error: "Transaction not found or failed on BSC Testnet" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Could not verify transaction on BSC Testnet Chapel" }, { status: 400 });
    }

    demoNetworkById(body.tradeNetwork);

    if (body.useAgentVault && body.side === "buy") {
      const spend = body.usdcAmount ?? 0;
      if (spend < 0.01) {
        return NextResponse.json({ error: "Buy amount too small" }, { status: 400 });
      }
      const ledger = await getAgentVaultLedger(body.wallet);
      if (ledger.balanceUsdc < spend) {
        return NextResponse.json(
          {
            error: `Agent vault balance $${ledger.balanceUsdc.toFixed(2)} — fund wallet with tBNB on BSC Testnet`,
          },
          { status: 400 },
        );
      }
    }

    const positions = await getDemoPositions(body.wallet);
    const position = positions.find(
      (p) =>
        p.tokenAddress.toLowerCase() === body.tokenAddress.toLowerCase() &&
        p.tradeNetwork === body.tradeNetwork,
    );

    const quote = buildDemoQuote({
      side: body.side,
      usdcAmount: body.usdcAmount,
      tokenAmount: body.tokenAmount,
      priceUsd: body.priceUsd,
      position,
    });

    const trade = {
      id: randomUUID(),
      wallet: body.wallet,
      side: body.side,
      symbol: body.symbol,
      tokenAddress: body.tokenAddress,
      sourceChain: body.sourceChain,
      tradeNetwork: body.tradeNetwork,
      usdcAmount: body.side === "buy" ? (quote.usdcIn ?? 0) : (quote.usdcOut ?? 0),
      tokenAmount: body.side === "buy" ? (quote.tokenOut ?? 0) : (quote.tokenIn ?? 0),
      priceUsd: body.priceUsd,
      arcFeeTxHash: body.arcFeeTxHash,
      timestamp: new Date().toISOString(),
      pnlUsd: "pnlUsd" in quote ? quote.pnlUsd : undefined,
    };

    const { positions: nextPositions } = applyDemoTrade([...positions], trade);
    await saveDemoTrade(trade, nextPositions);

    let agentBalanceUsdc: number | undefined;
    if (body.useAgentVault && body.side === "buy") {
      const debited = await debitAgentVault(body.wallet, trade.usdcAmount);
      agentBalanceUsdc = debited.balanceUsdc;
    }

    return NextResponse.json({
      trade,
      quote,
      positions: nextPositions,
      agentBalanceUsdc,
      settlement: "BSC Testnet tBNB",
      network: demoNetworkById(body.tradeNetwork).label,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Demo trade failed" },
      { status: 400 },
    );
  }
}
