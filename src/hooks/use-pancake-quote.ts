"use client";

import { useEffect, useState } from "react";
import {
  quoteNativeForToken,
  quoteTokenForNative,
  readTokenDecimals,
} from "@/lib/pancake-v2";
import { resolveTestnetSwapAddress } from "@/lib/testnet-onchain";
import { isBscNativeBnb } from "@/lib/arc-usdc-swap";

export type PancakeQuote = {
  tokenAmount: number;
  tbnbAmount: number;
  loading: boolean;
  available: boolean;
};

function fmt(n: bigint, decimals: number) {
  return Number(n) / 10 ** decimals;
}

export function usePancakeQuote(input: {
  side: "buy" | "sell";
  symbol: string;
  tokenAddress: string;
  chainId: string;
  amount: string;
  enabled?: boolean;
}): PancakeQuote {
  const [tokenAmount, setTokenAmount] = useState(0);
  const [tbnbAmount, setTbnbAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const amt = Number(input.amount);
    if (!input.enabled || !amt || amt <= 0 || isBscNativeBnb(input.tokenAddress)) {
      setTokenAmount(0);
      setTbnbAmount(0);
      setAvailable(false);
      return;
    }

    const token = resolveTestnetSwapAddress(input);
    if (!token) {
      setAvailable(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        if (input.side === "buy") {
          const q = await quoteNativeForToken(token, String(amt));
          if (cancelled || !q) {
            if (!cancelled) setAvailable(false);
            return;
          }
          const dec = await readTokenDecimals(token);
          setTokenAmount(fmt(q.amountOut, dec));
          setTbnbAmount(amt);
          setAvailable(true);
        } else {
          const dec = await readTokenDecimals(token);
          const q = await quoteTokenForNative(token, String(amt), dec);
          if (cancelled || !q) {
            if (!cancelled) setAvailable(false);
            return;
          }
          setTokenAmount(amt);
          setTbnbAmount(fmt(q.amountOut, 18));
          setAvailable(true);
        }
      } catch {
        if (!cancelled) setAvailable(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [input.side, input.symbol, input.tokenAddress, input.chainId, input.amount, input.enabled]);

  return { tokenAmount, tbnbAmount, loading, available };
}
