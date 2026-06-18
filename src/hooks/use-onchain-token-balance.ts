"use client";

import { useReadContract } from "wagmi";
import type { Address } from "viem";
import { formatUnits } from "viem";
import { ERC20_ABI } from "@/lib/pancake-v2";
import { BSC_CHAIN_ID } from "@/lib/bsc-chain";
import { resolveTestnetSwapAddress } from "@/lib/testnet-onchain";
import { isBscNativeBnb } from "@/lib/arc-usdc-swap";

export function useOnChainTokenBalance(input: {
  symbol: string;
  tokenAddress: string;
  chainId: string;
  wallet?: Address;
}) {
  const resolved = resolveTestnetSwapAddress(input);
  const enabled = Boolean(
    input.wallet && !isBscNativeBnb(input.tokenAddress) && resolved,
  );

  const { data: raw, refetch } = useReadContract({
    address: resolved ?? undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: input.wallet ? [input.wallet] : undefined,
    chainId: BSC_CHAIN_ID,
    query: { enabled },
  });

  const { data: decimals } = useReadContract({
    address: resolved ?? undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    chainId: BSC_CHAIN_ID,
    query: { enabled },
  });

  const amount =
    raw != null && decimals != null ? Number(formatUnits(raw, Number(decimals))) : 0;

  return { amount, refetch, resolved, enabled };
}
