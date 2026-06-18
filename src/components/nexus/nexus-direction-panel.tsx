"use client";

import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { NexusDirectionDesk } from "@/components/nexus/nexus-direction-desk";
import { usePositionRoute } from "@/hooks/use-position-route";
import { usePancakeSwap } from "@/hooks/use-pancake-swap";
import { useConstitution } from "@/contexts/nexus-constitution-context";
import { useToast } from "@/components/ui/toast-provider";
import { BSC_TESTNET_CATALOG, fetchDeskTokenBalance } from "@/lib/testnet-onchain";
import { BSC_CHAIN_ID } from "@/lib/bsc-chain";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import type { PositionRoute } from "@/lib/position-router";
import { appendMeridianActivity } from "@/lib/meridian-activity-log";

export function NexusDirectionPanel({
  token,
  hasRiskPosition,
  agentAction,
}: {
  token: TrendingMarketToken | null;
  hasRiskPosition?: boolean;
  agentAction?: string;
}) {
  const sym = token?.symbol?.replace(/^\$/, "").toUpperCase();
  const { route, loading } = usePositionRoute(sym, {
    hasPosition: hasRiskPosition,
    agentAction,
  });
  const { address } = useAccount();
  const { canExecuteBuy } = useConstitution();
  const { swapNativeForToken, swapTokenForNative, swapTokenForToken, isPending } = usePancakeSwap();
  const toast = useToast();
  const [executing, setExecuting] = useState(false);

  const executeRoute = useCallback(
    async (r: PositionRoute) => {
      if (!token || !address) {
        toast({ type: "error", title: "Connect wallet", message: "Connect on BSC Testnet to execute." });
        return;
      }
      const ex = r.execution;
      if (ex.kind === "none" || !ex.tradable) return;

      setExecuting(true);
      try {
        if (ex.kind === "long_tbnb") {
          if (!canExecuteBuy) {
            toast({ type: "error", title: "Permit blocked", message: "Constitution has not GRANTed this long." });
            return;
          }
          const tbnb = 0.01;
          const result = await swapNativeForToken({
            symbol: token.symbol,
            tokenAddress: token.tokenAddress,
            chainId: token.chainId,
            tbnbAmount: String(tbnb),
          });
          toast({ type: "success", title: "Long executed", message: result.summary });
          appendMeridianActivity({
            kind: "trade",
            level: "success",
            message: `Direction LONG ${token.symbol} · ${result.summary}`,
            symbol: token.symbol,
            txHash: result.hash,
          });
        } else if (ex.kind === "short_stable") {
          const usdc = BSC_TESTNET_CATALOG.find((c) => c.symbol === "USDC")!;
          const bal = await fetchDeskTokenBalance(address, token);
          if (bal <= 0) {
            toast({ type: "error", title: "No position", message: `Nothing to rotate from ${token.symbol}.` });
            return;
          }
          const amt = bal * 0.5;
          const result = await swapTokenForToken({
            paySymbol: token.symbol,
            payAddress: token.tokenAddress,
            payChainId: token.chainId,
            receiveSymbol: "USDC",
            receiveAddress: usdc.tokenAddress,
            receiveChainId: String(BSC_CHAIN_ID),
            tokenAmount: String(amt),
          });
          toast({ type: "success", title: "Short hedge", message: result.summary });
          appendMeridianActivity({
            kind: "trade",
            level: "success",
            message: `Direction SHORT hedge ${token.symbol}→USDC · ${result.summary}`,
            symbol: token.symbol,
            txHash: result.hash,
          });
        } else if (ex.kind === "exit_tbnb") {
          const bal = await fetchDeskTokenBalance(address, token);
          if (bal <= 0) {
            toast({ type: "error", title: "No position", message: "Nothing to sell." });
            return;
          }
          const result = await swapTokenForNative({
            symbol: token.symbol,
            tokenAddress: token.tokenAddress,
            chainId: token.chainId,
            tokenAmount: String(bal * 0.5),
          });
          toast({ type: "success", title: "De-risked", message: result.summary });
        }
      } catch (e) {
        toast({
          type: "error",
          title: "Execution failed",
          message: e instanceof Error ? e.message : "Swap failed",
        });
      } finally {
        setExecuting(false);
      }
    },
    [address, canExecuteBuy, swapNativeForToken, swapTokenForNative, swapTokenForToken, toast, token],
  );

  if (!sym) return null;

  return (
    <NexusDirectionDesk
      route={route}
      loading={loading}
      executing={executing || isPending}
      onExecute={route ? () => void executeRoute(route) : undefined}
    />
  );
}
