"use client";

import { useCallback, useMemo, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { ExternalLink, Loader2, Wallet } from "lucide-react";
import { useBnbSettlement } from "@/hooks/use-bnb-settlement";
import { useBnbSpotUsd } from "@/hooks/use-bnb-spot-usd";
import { usePancakeSwap } from "@/hooks/use-pancake-swap";
import { buySizingFromTbnb, formatTokenAmount } from "@/lib/demo-tbnb-math";
import { matchTestnetDeskBySymbol, canSwapOnBscTestnet } from "@/lib/testnet-onchain";
import { BSC_CHAIN_ID, bscExplorerTx } from "@/lib/bsc-chain";
import { cn } from "@/lib/utils";

const PRESETS = [0.01, 0.05, 0.1] as const;

export function GatePermitSwap({
  symbol,
  priceUsd,
  permitId,
  granted,
}: {
  symbol: string;
  priceUsd: number;
  permitId: string;
  granted: boolean;
}) {
  const { address, isConnected } = useAccount();
  const { ensureBscNetwork } = useBnbSettlement();
  const bnbSpotUsd = useBnbSpotUsd();
  const { swapNativeForToken, isPending } = usePancakeSwap();
  const { data: balance } = useBalance({ address, chainId: BSC_CHAIN_ID });

  const [tbnb, setTbnb] = useState("0.05");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const deskToken = useMemo(() => {
    const sym = symbol.toUpperCase();
    if (sym === "BNB") {
      return matchTestnetDeskBySymbol("CAKE", bnbSpotUsd);
    }
    return matchTestnetDeskBySymbol(symbol, bnbSpotUsd);
  }, [symbol, bnbSpotUsd]);

  const sizingSymbol = deskToken?.symbol ?? symbol;
  const tbnbNum = Math.max(0, Number(tbnb) || 0);
  const tbnbBal = balance ? Number(balance.formatted) : 0;

  const sizing = useMemo(() => {
    if (!deskToken || tbnbNum <= 0) return null;
    const px = deskToken.symbol === symbol ? priceUsd : deskToken.priceUsd || priceUsd;
    if (px <= 0) return null;
    return buySizingFromTbnb({ tbnbAmount: tbnbNum, bnbSpotUsd, tokenPriceUsd: px });
  }, [deskToken, symbol, tbnbNum, bnbSpotUsd, priceUsd]);

  const canSwap = granted && deskToken && canSwapOnBscTestnet(deskToken) && isConnected && tbnbNum > 0;

  const execute = useCallback(async () => {
    if (!deskToken || !address || !granted) return;
    setError(null);
    setTxHash(null);
    try {
      await ensureBscNetwork();
      if (tbnbNum > tbnbBal) {
        setError(`Need ${tbnbNum.toFixed(4)} tBNB — wallet has ${tbnbBal.toFixed(4)}`);
        return;
      }
      const result = await swapNativeForToken({
        symbol: deskToken.symbol,
        tokenAddress: deskToken.tokenAddress,
        chainId: deskToken.chainId,
        tbnbAmount: String(tbnbNum),
        slippageBps: 300,
      });
      setTxHash(result.hash);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Swap failed");
    }
  }, [deskToken, address, granted, ensureBscNetwork, tbnbNum, tbnbBal, swapNativeForToken]);

  if (!granted) {
    return (
      <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
        BUY blocked — constitution did not grant a permit for {symbol}.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">
          {symbol.toUpperCase() === "BNB" ? "Deploy secondary → CAKE" : `Size in · ${symbol}`}
        </p>
        <code className="text-[10px] text-emerald-200/60">{permitId}</code>
      </div>

      {symbol.toUpperCase() === "BNB" && (
        <p className="mb-2 text-xs text-white/50">
          BNB allocation stays as tBNB in your wallet ({tbnbBal.toFixed(4)} available).
        </p>
      )}

      {!isConnected ? (
        <p className="flex items-center gap-2 text-sm text-white/55">
          <Wallet className="h-4 w-4" /> Connect wallet to sign PancakeSwap on BSC Testnet
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTbnb(String(p))}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                  tbnbNum === p
                    ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-100"
                    : "border-white/10 bg-black/30 text-white/60 hover:border-white/20",
                )}
              >
                {p} tBNB
              </button>
            ))}
            <input
              type="number"
              min={0}
              step={0.001}
              value={tbnb}
              onChange={(e) => setTbnb(e.target.value)}
              className="w-24 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white"
              aria-label="tBNB amount"
            />
          </div>

          {sizing && (
            <p className="mt-2 text-xs text-white/50">
              ~{formatTokenAmount(sizing.tokenAmount)} {sizingSymbol} · ${sizing.usdNotional.toFixed(2)} notional
            </p>
          )}

          {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}

          {txHash && (
            <a
              href={bscExplorerTx(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-300 hover:underline"
            >
              Settled on-chain <ExternalLink className="h-3 w-3" />
            </a>
          )}

          <button
            type="button"
            disabled={!canSwap || isPending}
            onClick={() => void execute()}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
            {isPending ? "Confirm in wallet…" : `Sign buy ${sizingSymbol}`}
          </button>
        </>
      )}
    </div>
  );
}
