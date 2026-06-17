"use client";

import { useCallback } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { bsc, BSC_CHAIN_ID } from "@/lib/bsc-chain";

async function addBscToWallet() {
  const eth = (window as Window & { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
  if (!eth) return;
  await eth.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: `0x${BSC_CHAIN_ID.toString(16)}`,
        chainName: bsc.name,
        nativeCurrency: bsc.nativeCurrency,
        rpcUrls: bsc.rpcUrls.default.http,
        blockExplorerUrls: [bsc.blockExplorers.default.url],
      },
    ],
  });
}

/** BNB Chain wallet — no Circle/Arc fees; Constitution Permit gates trades instead. */
export function useBnbSettlement() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const onBsc = chainId === BSC_CHAIN_ID;

  const ensureBscNetwork = useCallback(async () => {
    if (!isConnected) throw new Error("Connect wallet first");
    if (chainId === BSC_CHAIN_ID) return;
    try {
      await switchChainAsync({ chainId: BSC_CHAIN_ID });
    } catch {
      await addBscToWallet();
      await switchChainAsync({ chainId: BSC_CHAIN_ID });
    }
    await new Promise((r) => setTimeout(r, 300));
  }, [chainId, isConnected, switchChainAsync]);

  /** Demo mode — constitution permit is the gate; no on-chain fee tx required. */
  const payBnbFee = useCallback(
    async (action: string, payload: string, _opts?: { waitReceipt?: boolean }) => {
      await ensureBscNetwork();
      return {
        txHash: `demo-${action}-${Date.now().toString(36)}`,
        payloadHash: payload.slice(0, 66),
        feeUsd: 0,
        chain: bsc.name,
        blockNumber: undefined as number | undefined,
      };
    },
    [ensureBscNetwork],
  );

  return {
    onBsc,
    onArc: onBsc,
    bscChainId: BSC_CHAIN_ID,
    feeUsd: 0,
    payBnbFee,
    payArcFee: payBnbFee,
    ensureBscNetwork,
    ensureArcNetwork: ensureBscNetwork,
    isPending: false,
  };
}
