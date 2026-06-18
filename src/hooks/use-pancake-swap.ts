"use client";

import { useCallback, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import type { Address } from "viem";
import { maxUint256 } from "viem";
import { useBnbSettlement } from "@/hooks/use-bnb-settlement";
import {
  DEFAULT_SLIPPAGE_BPS,
  ERC20_ABI,
  PANCAKE_V2_ROUTER,
  encodeSwapNativeForTokens,
  encodeSwapTokensForNative,
  encodeSwapTokensForTokens,
  formatTokenUnits,
  minOut,
  normalizeTokenAddress,
  quoteNativeForToken,
  quoteTokenForNative,
  quoteTokenForToken,
  readTokenDecimals,
  swapDeadline,
} from "@/lib/pancake-v2";
import { BSC_TESTNET_WBNB } from "@/lib/bsc-chain";
import { isBscNativeBnb } from "@/lib/arc-usdc-swap";
import { resolveTestnetSwapAddress } from "@/lib/testnet-onchain";

export type OnChainSwapResult = {
  hash: `0x${string}`;
  summary: string;
  amountOutFormatted: string;
};

export function usePancakeSwap() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { ensureBscNetwork } = useBnbSettlement();
  const { sendTransactionAsync, isPending: sending } = useSendTransaction();
  const { writeContractAsync, isPending: writing } = useWriteContract();
  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: pendingHash });

  const isPending = sending || writing || confirming;

  const ensureAllowance = useCallback(
    async (token: Address, amount: bigint) => {
      if (!address || !publicClient) throw new Error("Connect wallet first");
      const allowance = await publicClient.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, PANCAKE_V2_ROUTER],
      });
      if (allowance >= amount) return;
      const approveHash = await writeContractAsync({
        address: token,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [PANCAKE_V2_ROUTER, maxUint256],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
    },
    [address, publicClient, writeContractAsync],
  );

  const swapNativeForToken = useCallback(
    async (input: {
      symbol: string;
      tokenAddress: string;
      chainId: string;
      tbnbAmount: string;
      slippageBps?: number;
    }): Promise<OnChainSwapResult> => {
      if (!address) throw new Error("Connect wallet first");
      await ensureBscNetwork();

      const tokenOut = resolveTestnetSwapAddress(input);
      if (!tokenOut) {
        throw new Error(`${input.symbol} has no BSC Testnet pool — pick CAKE or a testnet token`);
      }

      const quote = await quoteNativeForToken(tokenOut, input.tbnbAmount);
      if (!quote) {
        throw new Error(`No PancakeSwap liquidity for tBNB → ${input.symbol} on BSC Testnet`);
      }

      const slippage = input.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
      const deadline = swapDeadline();
      const amountOutMin = minOut(quote.amountOut, slippage);
      const tx = encodeSwapNativeForTokens({
        amountOutMin,
        path: quote.path,
        to: address,
        deadline,
        value: quote.amountIn,
      });

      const hash = await sendTransactionAsync({
        to: tx.to,
        data: tx.data,
        value: tx.value,
      });
      setPendingHash(hash);
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });

      const decimals = await readTokenDecimals(tokenOut);
      const outFmt = formatTokenUnits(quote.amountOut, decimals);
      return {
        hash,
        amountOutFormatted: outFmt,
        summary: `${input.tbnbAmount} tBNB → ~${outFmt} ${input.symbol}`,
      };
    },
    [address, ensureBscNetwork, publicClient, sendTransactionAsync],
  );

  const swapTokenForNative = useCallback(
    async (input: {
      symbol: string;
      tokenAddress: string;
      chainId: string;
      tokenAmount: string;
      slippageBps?: number;
    }): Promise<OnChainSwapResult> => {
      if (!address) throw new Error("Connect wallet first");
      await ensureBscNetwork();

      const tokenIn = resolveTestnetSwapAddress(input);
      if (!tokenIn) throw new Error(`${input.symbol} is not swappable on BSC Testnet`);

      const decimals = await readTokenDecimals(tokenIn);
      const quote = await quoteTokenForNative(tokenIn, input.tokenAmount, decimals);
      if (!quote) {
        throw new Error(`No PancakeSwap liquidity for ${input.symbol} → tBNB on BSC Testnet`);
      }

      await ensureAllowance(tokenIn, quote.amountIn);

      const slippage = input.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
      const deadline = swapDeadline();
      const amountOutMin = minOut(quote.amountOut, slippage);
      const tx = encodeSwapTokensForNative({
        amountIn: quote.amountIn,
        amountOutMin,
        path: quote.path,
        to: address,
        deadline,
      });

      const hash = await sendTransactionAsync({
        to: tx.to,
        data: tx.data,
        value: tx.value,
      });
      setPendingHash(hash);
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });

      const outFmt = formatTokenUnits(quote.amountOut, 18);
      return {
        hash,
        amountOutFormatted: outFmt,
        summary: `${input.tokenAmount} ${input.symbol} → ~${outFmt} tBNB`,
      };
    },
    [address, ensureAllowance, ensureBscNetwork, publicClient, sendTransactionAsync],
  );

  const swapTokenForToken = useCallback(
    async (input: {
      paySymbol: string;
      payAddress: string;
      payChainId: string;
      receiveSymbol: string;
      receiveAddress: string;
      receiveChainId: string;
      tokenAmount: string;
      slippageBps?: number;
    }): Promise<OnChainSwapResult> => {
      if (!address) throw new Error("Connect wallet first");
      await ensureBscNetwork();

      const tokenIn = resolveTestnetSwapAddress({
        symbol: input.paySymbol,
        tokenAddress: input.payAddress,
        chainId: input.payChainId,
      });
      const tokenOut = resolveTestnetSwapAddress({
        symbol: input.receiveSymbol,
        tokenAddress: input.receiveAddress,
        chainId: input.receiveChainId,
      });
      if (!tokenIn || !tokenOut) {
        throw new Error("Both tokens must exist on BSC Testnet with PancakeSwap liquidity");
      }

      const decimalsIn = await readTokenDecimals(tokenIn);
      const quote = await quoteTokenForToken(tokenIn, tokenOut, input.tokenAmount, decimalsIn);
      if (!quote) {
        throw new Error(`No route ${input.paySymbol} → ${input.receiveSymbol} on BSC Testnet`);
      }

      await ensureAllowance(tokenIn, quote.amountIn);

      const slippage = input.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
      const deadline = swapDeadline();
      const amountOutMin = minOut(quote.amountOut, slippage);
      const tx = encodeSwapTokensForTokens({
        amountIn: quote.amountIn,
        amountOutMin,
        path: quote.path,
        to: address,
        deadline,
      });

      const hash = await sendTransactionAsync({
        to: tx.to,
        data: tx.data,
        value: tx.value,
      });
      setPendingHash(hash);
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });

      const decimalsOut = await readTokenDecimals(tokenOut);
      const outFmt = formatTokenUnits(quote.amountOut, decimalsOut);
      return {
        hash,
        amountOutFormatted: outFmt,
        summary: `${input.tokenAmount} ${input.paySymbol} → ~${outFmt} ${input.receiveSymbol}`,
      };
    },
    [address, ensureAllowance, ensureBscNetwork, publicClient, sendTransactionAsync],
  );

  const resolveOutAddress = useCallback(
    (symbol: string, tokenAddress: string, chainId: string) =>
      resolveTestnetSwapAddress({ symbol, tokenAddress, chainId }),
    [],
  );

  return {
    isPending,
    pendingHash,
    swapNativeForToken,
    swapTokenForNative,
    swapTokenForToken,
    resolveOutAddress,
    wbnb: BSC_TESTNET_WBNB,
    isNative: isBscNativeBnb,
    normalizeTokenAddress,
  };
}
