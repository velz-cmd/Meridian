"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { CheckCircle2, ChevronDown, ExternalLink, History, Loader2 } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { nexusActionGlass, nexusGlassCta } from "@/lib/nexus-action-glass";
import { NEXUS_TRADE_ICONS } from "@/lib/nexus-trade-icons";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast-provider";
import { useBnbSettlement } from "@/hooks/use-bnb-settlement";
import { useBnbSpotUsd } from "@/hooks/use-bnb-spot-usd";
import { useSwapTokenQuotes } from "@/hooks/use-swap-token-quotes";
import { buildBscTestnetTradeTokens } from "@/lib/testnet-onchain";
import { useOnChainTokenBalance } from "@/hooks/use-onchain-token-balance";
import {
  quoteNativeForToken,
  quoteTokenForNative,
  quoteTokenForToken,
  readTokenDecimals,
  formatTokenUnits,
} from "@/lib/pancake-v2";
import { usePancakeSwap } from "@/hooks/use-pancake-swap";
import { resolveTestnetSwapAddress } from "@/lib/testnet-onchain";
import { NexusTokenAvatar } from "@/components/nexus/nexus-token-avatar";
import { BSC_CHAIN_ID, BSC_CHAIN_LABEL, bscExplorerTx } from "@/lib/bsc-chain";
import {
  isBscNativeBnb,
  mergeSwapTokenList,
} from "@/lib/arc-usdc-swap";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

const PCT_OPTIONS = [25, 50, 75] as const;
const SWAP_HISTORY_KEY = "nexus-onchain-swaps";

type SwapHistoryRow = {
  id: string;
  summary: string;
  hash: string;
  at: string;
};

type SwapSuccessState = {
  summary: string;
  swapTxHash: string;
};

function formatSwapBalance(token: TrendingMarketToken, amount: number) {
  if (isBscNativeBnb(token.tokenAddress)) return amount.toFixed(4);
  if (amount >= 1000) return amount.toFixed(2);
  if (amount >= 1) return amount.toFixed(4);
  return amount.toFixed(6);
}

function TokenPicker({
  label,
  value,
  onChange,
  tokens,
  balanceOf,
}: {
  label: string;
  value: string;
  onChange: (addr: string) => void;
  tokens: TrendingMarketToken[];
  balanceOf: (token: TrendingMarketToken) => number;
}) {
  const [open, setOpen] = useState(false);
  const selected = tokens.find(
    (t) => t.tokenAddress.toLowerCase() === value.toLowerCase(),
  );
  const selectedBal = selected ? balanceOf(selected) : 0;

  return (
    <div className="relative">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-1 flex w-full min-h-[48px] items-center gap-2.5 rounded-xl border border-white/15 bg-black/45 px-3 text-left transition hover:border-cyan-400/35"
      >
        <NexusTokenAvatar symbol={selected?.symbol ?? "?"} icon={selected?.icon} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {selected ? selected.symbol : "Select"}
          </p>
          {selected && (
            <p className="truncate font-mono text-[11px] text-cyan-200/90">
              {formatSwapBalance(selected, selectedBal)}
            </p>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/50 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-white/15 bg-[#0a1220] py-1 shadow-xl">
          {tokens.length === 0 ? (
            <p className="px-3 py-3 text-xs text-white/50">No tokens yet.</p>
          ) : (
            tokens.map((t) => {
              const bal = balanceOf(t);
              return (
                <button
                  key={`${t.chainId}:${t.tokenAddress}`}
                  type="button"
                  onClick={() => {
                    onChange(t.tokenAddress);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-white/5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <NexusTokenAvatar symbol={t.symbol} icon={t.icon} size="sm" />
                    <p className="text-sm font-semibold text-white">{t.symbol}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-white/70">
                    {formatSwapBalance(t, bal)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function NexusQuickSwap({
  onComplete,
}: {
  /** @deprecated desk list is fixed BSC Testnet tokens */
  tokens?: TrendingMarketToken[];
  alphaTokens?: Array<{
    symbol: string;
    name: string;
    tokenAddress: string;
    chainId: string;
    priceUsd: number;
    change24h: number;
    icon?: string;
  }>;
  onComplete?: () => void;
}) {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { data: walletBalance } = useBalance({ address, chainId: BSC_CHAIN_ID });
  const { ensureBscNetwork } = useBnbSettlement();
  const bnbSpotUsd = useBnbSpotUsd();
  const { swapNativeForToken, swapTokenForNative, swapTokenForToken, isPending: swapPending } =
    usePancakeSwap();

  const mergedTokens = useMemo(
    () => mergeSwapTokenList([], undefined, bnbSpotUsd),
    [bnbSpotUsd],
  );
  const allTokens = useSwapTokenQuotes(mergedTokens, bnbSpotUsd);

  const [payToken, setPayToken] = useState("");
  const [receiveToken, setReceiveToken] = useState("");
  const [amount, setAmount] = useState("");
  const [amountMode, setAmountMode] = useState<"token" | "usdc">("token");
  const [loading, setLoading] = useState(false);
  const [recentTrades, setRecentTrades] = useState<SwapHistoryRow[]>([]);
  const [success, setSuccess] = useState<SwapSuccessState | null>(null);
  const [swapView, setSwapView] = useState<"swap" | "history">("swap");
  const [onChainEstReceive, setOnChainEstReceive] = useState<string | null>(null);

  const walletTbnb = walletBalance ? Number(walletBalance.formatted) : 0;

  const loadHistory = useCallback(() => {
    try {
      const raw = localStorage.getItem(SWAP_HISTORY_KEY);
      setRecentTrades(raw ? (JSON.parse(raw) as SwapHistoryRow[]).slice(0, 25) : []);
    } catch {
      setRecentTrades([]);
    }
  }, []);

  const pushHistory = useCallback(
    (row: SwapHistoryRow) => {
      setRecentTrades((prev) => {
        const next = [row, ...prev].slice(0, 25);
        localStorage.setItem(SWAP_HISTORY_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const sortedTokens = useMemo(() => {
    return [...allTokens].sort((a, b) => {
      const aNative = isBscNativeBnb(a.tokenAddress) ? 2 : 0;
      const bNative = isBscNativeBnb(b.tokenAddress) ? 2 : 0;
      if (aNative !== bNative) return bNative - aNative;
      const aPriced = a.priceUsd > 0 ? 1 : 0;
      const bPriced = b.priceUsd > 0 ? 1 : 0;
      if (aPriced !== bPriced) return bPriced - aPriced;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [allTokens]);

  const receiveOptions = useMemo(
    () =>
      sortedTokens.filter((t) => t.tokenAddress.toLowerCase() !== payToken.toLowerCase()),
    [sortedTokens, payToken],
  );

  useEffect(() => {
    if (!payToken && sortedTokens[0]) setPayToken(sortedTokens[0].tokenAddress);
  }, [sortedTokens, payToken]);

  useEffect(() => {
    if (!payToken) return;
    const needsReceive =
      !receiveToken || receiveToken.toLowerCase() === payToken.toLowerCase();
    if (!needsReceive) return;
    const next = receiveOptions[0];
    if (next) setReceiveToken(next.tokenAddress);
  }, [payToken, receiveToken, receiveOptions]);

  useEffect(() => {
    if (payToken && isBscNativeBnb(payToken)) setAmountMode("usdc");
  }, [payToken]);

  const pay = sortedTokens.find((t) => t.tokenAddress.toLowerCase() === payToken.toLowerCase());
  const receive = sortedTokens.find(
    (t) => t.tokenAddress.toLowerCase() === receiveToken.toLowerCase(),
  );
  const payIsNative = pay ? isBscNativeBnb(pay.tokenAddress) : false;
  const receiveIsNative = receive ? isBscNativeBnb(receive.tokenAddress) : false;
  const sameToken =
    !!pay &&
    !!receive &&
    pay.tokenAddress.toLowerCase() === receive.tokenAddress.toLowerCase();

  const payTokenBal = useOnChainTokenBalance({
    symbol: pay?.symbol ?? "",
    tokenAddress: pay?.tokenAddress ?? "",
    chainId: pay?.chainId ?? "",
    wallet: address,
  });

  const balancePay = payIsNative ? walletTbnb : payTokenBal.amount;

  const amountNum = Math.max(0, Number(amount) || 0);
  const tokenAmountSell = payIsNative
    ? 0
    : amountMode === "usdc"
      ? amountNum
      : amountNum;

  const usdNotional = payIsNative
    ? amountNum * bnbSpotUsd
    : amountMode === "usdc"
      ? amountNum * bnbSpotUsd
      : tokenAmountSell * (pay?.priceUsd ?? 0);

  useEffect(() => {
    let cancelled = false;
    async function loadQuote() {
      if (!pay || !receive || amountNum <= 0) {
        setOnChainEstReceive(null);
        return;
      }
      try {
        if (payIsNative && !receiveIsNative) {
          const out = resolveTestnetSwapAddress(receive);
          if (!out) {
            setOnChainEstReceive(null);
            return;
          }
          const q = await quoteNativeForToken(out, String(amountNum));
          if (cancelled || !q) {
            setOnChainEstReceive(null);
            return;
          }
          const dec = await readTokenDecimals(out);
          setOnChainEstReceive(formatTokenUnits(q.amountOut, dec));
          return;
        }
        if (receiveIsNative && !payIsNative) {
          const inn = resolveTestnetSwapAddress(pay);
          if (!inn) {
            setOnChainEstReceive(null);
            return;
          }
          const dec = await readTokenDecimals(inn);
          const q = await quoteTokenForNative(inn, String(tokenAmountSell), dec);
          if (cancelled || !q) {
            setOnChainEstReceive(null);
            return;
          }
          setOnChainEstReceive(formatTokenUnits(q.amountOut, 18));
          return;
        }
        if (!payIsNative && !receiveIsNative) {
          const inn = resolveTestnetSwapAddress(pay);
          const out = resolveTestnetSwapAddress(receive);
          if (!inn || !out) {
            setOnChainEstReceive(null);
            return;
          }
          const decIn = await readTokenDecimals(inn);
          const q = await quoteTokenForToken(inn, out, String(tokenAmountSell), decIn);
          if (cancelled || !q) {
            setOnChainEstReceive(null);
            return;
          }
          const decOut = await readTokenDecimals(out);
          setOnChainEstReceive(formatTokenUnits(q.amountOut, decOut));
        }
      } catch {
        if (!cancelled) setOnChainEstReceive(null);
      }
    }
    void loadQuote();
    return () => {
      cancelled = true;
    };
  }, [pay, receive, amountNum, payIsNative, receiveIsNative, tokenAmountSell]);

  const swapBlockedHint = null;

  function applyPct(pct: number) {
    if (payIsNative) {
      if (walletTbnb <= 0) {
        toast({ type: "error", title: "No tBNB", message: `Fund wallet on ${BSC_CHAIN_LABEL}` });
        return;
      }
      setAmount(((walletTbnb * pct) / 100).toFixed(2));
      return;
    }
    if (amountMode === "token") {
      if (balancePay <= 0) {
        toast({ type: "error", title: "No balance", message: `You hold 0 ${pay?.symbol ?? "token"} on-chain` });
        return;
      }
      setAmount(((balancePay * pct) / 100).toFixed(pct === 100 ? 6 : 4));
      return;
    }
    if (balancePay <= 0) {
      toast({ type: "error", title: "No balance", message: "Select a token you hold on-chain" });
      return;
    }
    setAmount(((balancePay * pct) / 100).toFixed(pct === 100 ? 6 : 4));
  }

  async function executeSwap() {
    if (!pay || !receive || !address) {
      toast({ type: "error", title: "Select tokens", message: "Pick pay and receive tokens" });
      return;
    }
    if (swapBlockedHint) {
      toast({ type: "error", title: "Not on BSC Testnet", message: swapBlockedHint });
      return;
    }
    if (sameToken) {
      toast({ type: "error", title: "Same token", message: "Choose two different tokens" });
      return;
    }
    if (amountNum <= 0) {
      toast({ type: "error", title: "Amount", message: "Enter a valid amount" });
      return;
    }
    if (payIsNative) {
      if (amountNum > walletTbnb + 1e-9) {
        toast({
          type: "error",
          title: "Insufficient tBNB",
          message: `Wallet has ${walletTbnb.toFixed(4)} tBNB`,
        });
        return;
      }
    } else if (tokenAmountSell > balancePay + 1e-9) {
      toast({
        type: "error",
        title: "Insufficient balance",
        message: `You have ${balancePay.toFixed(4)} ${pay.symbol} on-chain`,
      });
      return;
    }

    setLoading(true);
    setSuccess(null);

    try {
      await ensureBscNetwork();

      let result;
      if (payIsNative && !receiveIsNative) {
        result = await swapNativeForToken({
          symbol: receive.symbol,
          tokenAddress: receive.tokenAddress,
          chainId: receive.chainId,
          tbnbAmount: String(amountNum),
        });
      } else if (receiveIsNative && !payIsNative) {
        result = await swapTokenForNative({
          symbol: pay.symbol,
          tokenAddress: pay.tokenAddress,
          chainId: pay.chainId,
          tokenAmount: String(tokenAmountSell),
        });
      } else if (!payIsNative && !receiveIsNative) {
        result = await swapTokenForToken({
          paySymbol: pay.symbol,
          payAddress: pay.tokenAddress,
          payChainId: pay.chainId,
          receiveSymbol: receive.symbol,
          receiveAddress: receive.tokenAddress,
          receiveChainId: receive.chainId,
          tokenAmount: String(tokenAmountSell),
        });
      } else {
        throw new Error("Cannot swap tBNB to tBNB");
      }

      setSuccess({ summary: result.summary, swapTxHash: result.hash });
      pushHistory({
        id: result.hash,
        summary: result.summary,
        hash: result.hash,
        at: new Date().toISOString(),
      });
      setAmount("");
      void payTokenBal.refetch();

      toast({
        type: "success",
        title: "Swap confirmed on-chain",
        message: result.summary,
      });
      onComplete?.();
    } catch (e) {
      toast({
        type: "error",
        title: "Swap failed",
        message: e instanceof Error ? e.message : "Could not complete swap",
      });
    } finally {
      setLoading(false);
    }
  }

  function reverseTokens() {
    if (!payToken || !receiveToken) return;
    const prevPay = payToken;
    setPayToken(receiveToken);
    setReceiveToken(prevPay);
    setSuccess(null);
  }

  const tokenBalance = useCallback(
    (token: TrendingMarketToken) => {
      if (isBscNativeBnb(token.tokenAddress)) return walletTbnb;
      if (
        pay &&
        token.tokenAddress.toLowerCase() === pay.tokenAddress.toLowerCase() &&
        !payIsNative
      ) {
        return payTokenBal.amount;
      }
      return 0;
    },
    [walletTbnb, pay, payIsNative, payTokenBal.amount],
  );

  const swapReady =
    amountNum > 0 &&
    !!pay &&
    !!receive &&
    !sameToken &&
    !swapBlockedHint &&
    onChainEstReceive != null &&
    isConnected &&
    !loading &&
    !swapPending;

  return (
    <section className="nexus-quick-swap-panel nexus-section-card arc-glass-card arc-glass-card-nexus arc-border-trace relative space-y-2.5 rounded-2xl p-3">
      <div className="nexus-quick-swap-header relative flex items-center gap-2.5 pr-11">
        <ArcIcon3d icon={NEXUS_TRADE_ICONS.swap} theme="nexus" size="sm" />
        <p className="min-w-0 flex-1 text-sm font-semibold text-white">
          {swapView === "history" ? "Tx history" : "Quick swap"}
        </p>
        <button
          type="button"
          onClick={() => setSwapView((v) => (v === "history" ? "swap" : "history"))}
          className={nexusActionGlass(
            "alpha",
            swapView === "history",
            "nexus-tx-history-fab absolute right-0 top-1/2 z-[2] flex -translate-y-1/2 items-center justify-center",
          )}
          title={swapView === "history" ? "Back to swap" : "Transaction history"}
          aria-label="Transaction history"
        >
          <History className="h-4 w-4 shrink-0" />
        </button>
      </div>

      {swapView === "history" ? (
        <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-2">
          {!address ? (
            <p className="py-4 text-center text-xs text-white/50">Connect wallet to see history.</p>
          ) : recentTrades.length === 0 ? (
            <p className="py-4 text-center text-xs text-white/50">No swaps yet.</p>
          ) : (
            recentTrades.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 text-[11px]"
              >
                <span className="text-white/80">{t.summary}</span>
                <a
                  href={bscExplorerTx(t.hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 font-semibold text-cyan-300 hover:underline"
                >
                  tx
                </a>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <TokenPicker
          label="You pay"
          value={payToken}
          onChange={(addr) => {
            setPayToken(addr);
            setSuccess(null);
          }}
          tokens={sortedTokens}
          balanceOf={tokenBalance}
        />
        <button
          type="button"
          onClick={reverseTokens}
          disabled={!payToken || !receiveToken}
          className={cn(
            "arc-glass-interactive nexus-swap-reverse-btn relative z-[1] mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-violet-400/45",
            "bg-gradient-to-br from-violet-500/35 to-fuchsia-600/25 text-violet-50 shadow-[0_0_20px_rgba(168,85,247,0.25)]",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
          title="Reverse pay and receive"
          aria-label="Reverse tokens"
        >
          <NEXUS_TRADE_ICONS.swap className="h-5 w-5" strokeWidth={2.25} />
        </button>
        <TokenPicker
          label="You receive"
          value={receiveToken}
          onChange={(addr) => {
            setReceiveToken(addr);
            setSuccess(null);
          }}
          tokens={receiveOptions}
          balanceOf={tokenBalance}
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/45">Amount</span>
          {!payIsNative && (
            <div className="inline-flex rounded-lg border border-white/15 p-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setAmountMode("token")}
                className={`rounded-md px-2.5 py-1 transition ${
                  amountMode === "token" ? "bg-cyan-500/25 text-cyan-100" : "text-white/50"
                }`}
              >
                {pay?.symbol ?? "Token"}
              </button>
              <button
                type="button"
                onClick={() => setAmountMode("usdc")}
                className={`rounded-md px-2.5 py-1 transition ${
                  amountMode === "usdc" ? "bg-emerald-500/25 text-emerald-100" : "text-white/50"
                }`}
              >
                tBNB
              </button>
            </div>
          )}
        </div>

        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setSuccess(null);
          }}
          placeholder={payIsNative || amountMode === "usdc" ? "tBNB amount" : "Token amount"}
          className="w-full min-h-[44px] rounded-xl border border-white/15 bg-black/40 px-3 text-lg font-medium text-white outline-none focus:border-cyan-400/40"
        />

        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {PCT_OPTIONS.map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => applyPct(pct)}
              className="min-h-[36px] rounded-lg border border-white/12 bg-white/5 text-xs font-semibold text-white/75 hover:bg-white/10"
            >
              {pct}%
            </button>
          ))}
          <button
            type="button"
            onClick={() => applyPct(100)}
            className="min-h-[36px] rounded-lg border border-violet-400/35 bg-violet-500/20 text-xs font-bold text-violet-100"
          >
            MAX
          </button>
        </div>

        {pay && receive && amountNum > 0 && (
          <p className="mt-2 text-xs text-cyan-100/85">
            ≈{" "}
            {payIsNative
              ? `${amountNum.toFixed(4)} tBNB (~$${usdNotional.toFixed(2)})`
              : `${tokenAmountSell.toFixed(4)} ${pay.symbol}`}{" "}
            →{" "}
            {receiveIsNative
              ? onChainEstReceive
                ? `${onChainEstReceive} tBNB`
                : "… (checking PancakeSwap pool)"
              : onChainEstReceive
                ? `${onChainEstReceive} ${receive.symbol}`
                : `… ${receive.symbol} (checking PancakeSwap pool)`}
          </p>
        )}
        {swapBlockedHint && (
          <p className="mt-2 text-xs text-amber-200/90">{swapBlockedHint}</p>
        )}
        <p className="mt-2 text-[10px] text-white/45">
          PancakeSwap V2 on BSC Testnet — wallet will ask you to sign each swap.
        </p>
      </div>

      {isConnected ? (
        <button
          type="button"
          className={nexusGlassCta("swap", "min-h-[48px] w-full", swapReady)}
          disabled={!swapReady}
          onClick={() => void executeSwap()}
        >
          {loading || swapPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {sameToken
            ? "Pick two different tokens"
            : swapBlockedHint
              ? "Not swappable on testnet"
              : `Sign swap ${pay?.symbol ?? "—"} → ${receive?.symbol ?? "—"}`}
        </button>
      ) : (
        <p className="text-center text-xs text-white/50">Connect wallet (top right) to swap</p>
      )}

      {success && (
        <p className="flex flex-wrap items-center justify-center gap-1.5 text-center text-xs text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span>On-chain swap — {success.summary}</span>
          <a
            href={bscExplorerTx(success.swapTxHash)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 font-semibold text-cyan-200 hover:underline"
          >
            BscScan <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      )}
        </>
      )}
    </section>
  );
}
