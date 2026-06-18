"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { Coins, ExternalLink, Loader2 } from "lucide-react";
import { NexusAutopilotPanel } from "@/components/nexus/nexus-autopilot-panel";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { NexusTradeBalanceBar } from "@/components/nexus/nexus-trade-balance-bar";
import { NexusTokenChatButton } from "@/components/nexus/nexus-token-chat";
import { NexusAgentWalletProvider } from "@/components/nexus/nexus-agent-wallet-provider";
import { useConstitution } from "@/contexts/nexus-constitution-context";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { nexusActionGlass, nexusGlassCta } from "@/lib/nexus-action-glass";
import { NEXUS_TRADE_ICONS } from "@/lib/nexus-trade-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast-provider";
import { useBnbSettlement } from "@/hooks/use-bnb-settlement";
import { useBnbSpotUsd } from "@/hooks/use-bnb-spot-usd";
import { usePancakeSwap } from "@/hooks/use-pancake-swap";
import { usePancakeQuote } from "@/hooks/use-pancake-quote";
import { useOnChainTokenBalance } from "@/hooks/use-onchain-token-balance";
import { buySizingFromTbnb, formatTokenAmount } from "@/lib/demo-tbnb-math";
import { canSwapOnBscTestnet, testnetSwapHint } from "@/lib/testnet-onchain";
import { bscExplorerAddress, bscExplorerTx } from "@/lib/bsc-chain";
import { BSC_CHAIN_ID, BSC_CHAIN_LABEL } from "@/lib/bsc-chain";
import { formatPct, formatTokenPrice, truncateHash } from "@/lib/utils";
import { appendMeridianActivity } from "@/lib/meridian-activity-log";
import type { NexusDecision } from "@/lib/storage";

type TradeToken = TrendingMarketToken | NexusDecision | null;

function asTradeToken(token: TradeToken) {
  if (!token) return null;
  return {
    symbol: token.symbol,
    tokenAddress: "token" in token ? token.token : token.tokenAddress,
    chainId: token.chainId,
    priceUsd: token.priceUsd,
    pairAddress: token.pairAddress,
    icon: "icon" in token ? token.icon : undefined,
  };
}

type AmountMode = "tbnb" | "token";

const TRADE_NETWORK = "bsc" as const;
const PCT_OPTIONS = [25, 50, 75] as const;

function formatAmount(n: number) {
  if (n >= 1000) return n.toFixed(0);
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(6);
}

type TradeTab = "buy" | "sell" | "agent";

export function NexusTradeHub({
  token,
  catalogTokens = [],
  onTradeComplete,
  activeTab,
  onTabChange,
  embedded = false,
}: {
  token: TradeToken;
  /** Live feed catalog for Autopilot token search */
  catalogTokens?: TrendingMarketToken[];
  onTradeComplete?: () => void;
  activeTab?: TradeTab;
  onTabChange?: (tab: TradeTab) => void;
  /** Inside NexusCollapsible — skip duplicate outer panel */
  embedded?: boolean;
}) {
  const [internalTab, setInternalTab] = useState<TradeTab>("buy");
  const tradeTab = activeTab ?? internalTab;
  const { canExecuteBuy, payload: constitutionPayload } = useConstitution();
  const constitutionBlocked = tradeTab === "buy" && !canExecuteBuy;
  const [agentLive, setAgentLive] = useState(false);
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { ensureBscNetwork } = useBnbSettlement();
  const bnbSpotUsd = useBnbSpotUsd();
  const { swapNativeForToken, swapTokenForNative, isPending: swapPending } = usePancakeSwap();
  const { data: balance } = useBalance({ address, chainId: BSC_CHAIN_ID });

  const setTab = (tab: TradeTab) => {
    if (activeTab === undefined) setInternalTab(tab);
    onTabChange?.(tab);
  };

  const trade = asTradeToken(token);
  const side = tradeTab === "sell" ? "sell" : "buy";
  const amountMode: AmountMode = side === "buy" ? "tbnb" : "token";
  const [amount, setAmount] = useState("0.01");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<{ hash: string; block?: number } | null>(null);

  const walletTbnb = balance ? Number(balance.formatted) : 0;
  const onChainBal = useOnChainTokenBalance({
    symbol: trade?.symbol ?? "",
    tokenAddress: trade?.tokenAddress ?? "",
    chainId: trade?.chainId ?? "",
    wallet: address,
  });
  const tokenBalance = onChainBal.amount;
  const tradeOnChain = trade ? canSwapOnBscTestnet(trade) : false;
  const tradeOnChainHint = trade ? testnetSwapHint(trade) : null;

  useEffect(() => {
    setAmount(side === "buy" ? "0.01" : "0");
  }, [side, trade?.tokenAddress]);

  const livePrice = trade?.priceUsd ?? 0;
  const amountNum = Math.max(0, Number(amount) || 0);

  const spendTbnb = useMemo(() => {
    if (!trade || amountNum <= 0) return 0;
    if (side === "buy") {
      if (amountMode === "tbnb") return amountNum;
      if (livePrice > 0) return (amountNum * livePrice) / bnbSpotUsd;
    }
    return 0;
  }, [trade, side, amountNum, amountMode, livePrice, bnbSpotUsd]);

  const pancakeQuote = usePancakeQuote({
    side: side === "sell" ? "sell" : "buy",
    symbol: trade?.symbol ?? "",
    tokenAddress: trade?.tokenAddress ?? "",
    chainId: trade?.chainId ?? "",
    amount: side === "sell" ? amount : String(spendTbnb || amountNum),
    enabled: Boolean(trade && tradeOnChain && amountNum > 0),
  });

  const resolved = useMemo(() => {
    if (!trade || amountNum <= 0) {
      return { usdcAmount: 0, tokenAmount: 0, tbnbSpent: 0 };
    }
    if (side === "buy") {
      const tbnb = spendTbnb;
      const tokenAmount =
        pancakeQuote.available && pancakeQuote.tokenAmount > 0
          ? pancakeQuote.tokenAmount
          : livePrice > 0
            ? buySizingFromTbnb({ tbnbAmount: tbnb, bnbSpotUsd, tokenPriceUsd: livePrice }).tokenAmount
            : 0;
      const usdcAmount = tbnb * bnbSpotUsd;
      return { usdcAmount, tokenAmount, tbnbSpent: tbnb };
    }
    if (amountMode === "token") {
      const usdcAmount = amountNum * livePrice;
      const tbnbOut =
        pancakeQuote.available && pancakeQuote.tbnbAmount > 0
          ? pancakeQuote.tbnbAmount
          : livePrice > 0
            ? usdcAmount / bnbSpotUsd
            : 0;
      return { usdcAmount, tokenAmount: amountNum, tbnbSpent: tbnbOut };
    }
    const usd = amountNum * bnbSpotUsd;
    return {
      usdcAmount: usd,
      tokenAmount: livePrice > 0 ? usd / livePrice : 0,
      tbnbSpent: amountNum,
    };
  }, [trade, side, amountNum, livePrice, amountMode, bnbSpotUsd, spendTbnb, pancakeQuote]);

  const quoteLabel = useMemo(() => {
    if (!trade || amountNum <= 0) return null;
    if (pancakeQuote.loading) return "Fetching PancakeSwap quote…";
    if (side === "buy") {
      return `Sign buy ~${formatTokenAmount(resolved.tokenAmount)} ${trade.symbol} for ${resolved.tbnbSpent.toFixed(4)} tBNB via PancakeSwap`;
    }
    return `Sign sell ${resolved.tokenAmount.toFixed(4)} ${trade.symbol} for ~${resolved.tbnbSpent.toFixed(4)} tBNB via PancakeSwap`;
  }, [trade, side, amountNum, resolved, pancakeQuote.loading]);

  function applyPct(pct: number) {
    if (side === "buy") {
      const spend = (walletTbnb * pct) / 100;
      setAmount(formatAmount(Math.max(0, spend)));
      return;
    }
    setAmount(formatAmount((tokenBalance * pct) / 100));
  }

  async function executeOnChainTrade() {
    if (!trade || !address || amountNum <= 0) {
      setError("Enter an amount greater than 0");
      return;
    }
    if (!tradeOnChain) {
      setError(tradeOnChainHint ?? "This token is not on BSC Testnet — pick CAKE or a testnet token");
      return;
    }
    if (side === "buy" && resolved.tbnbSpent > walletTbnb) {
      setError(`Insufficient tBNB — need ${resolved.tbnbSpent.toFixed(4)}, have ${walletTbnb.toFixed(4)}`);
      return;
    }
    if (side === "sell" && resolved.tokenAmount > tokenBalance + 1e-9) {
      setError(`Insufficient ${trade.symbol} on-chain — you have ${tokenBalance.toFixed(4)}`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await ensureBscNetwork();
      const result =
        side === "buy"
          ? await swapNativeForToken({
              symbol: trade.symbol,
              tokenAddress: trade.tokenAddress,
              chainId: trade.chainId,
              tbnbAmount: String(resolved.tbnbSpent),
            })
          : await swapTokenForNative({
              symbol: trade.symbol,
              tokenAddress: trade.tokenAddress,
              chainId: trade.chainId,
              tokenAmount: String(resolved.tokenAmount),
            });

      setLastTx({ hash: result.hash });
      void onChainBal.refetch();

      const outAmt = parseFloat(result.amountOutFormatted) || resolved.tokenAmount;
      try {
        await fetch("/api/nexus/demo/trade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet: address,
            side,
            symbol: trade.symbol,
            tokenAddress: trade.tokenAddress,
            sourceChain: trade.chainId,
            tradeNetwork: "bsc",
            usdcAmount:
              side === "buy"
                ? resolved.tbnbSpent * bnbSpotUsd
                : outAmt * bnbSpotUsd,
            tokenAmount: side === "buy" ? outAmt : resolved.tokenAmount,
            priceUsd: livePrice,
            arcFeeTxHash: result.hash,
          }),
        });
      } catch {
        /* portfolio history optional */
      }

      toast({
        type: "success",
        title: side === "buy" ? "Buy confirmed on-chain" : "Sell confirmed on-chain",
        message: result.summary,
      });
      appendMeridianActivity({
        kind: "trade",
        level: "success",
        message: `${side.toUpperCase()} ${trade.symbol} · ${result.summary}`,
        symbol: trade.symbol,
        txHash: result.hash,
      });
      onTradeComplete?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Trade failed";
      setError(msg);
      toast({ type: "error", title: `${side === "buy" ? "Buy" : "Sell"} failed`, message: msg });
    } finally {
      setLoading(false);
    }
  }

  const marketToken =
    token && "tokenAddress" in token
      ? (token as TrendingMarketToken)
      : token && "token" in token
        ? ({
            symbol: token.symbol,
            name: token.name ?? token.symbol,
            tokenAddress: token.token,
            chainId: token.chainId,
            priceUsd: token.priceUsd,
            pairAddress: token.pairAddress ?? "",
            change24h: token.change24h,
            volume24h: token.volume24h ?? 0,
            liquidityUsd: token.liquidityUsd ?? 0,
            url: token.dexUrl ?? "",
          } as TrendingMarketToken)
        : null;

  const tradeConfirmFooter =
    tradeTab !== "agent" && trade ? (
      <div className="space-y-2">
        <div className="flex justify-between text-[11px] tracking-wide text-white/50">
          <span>
            {constitutionBlocked
              ? "Constitution · blocked"
              : canExecuteBuy
                ? "Constitution · cleared"
                : "Constitution · pending"}
          </span>
          <span className="font-medium text-cyan-100/90">Wallet signs on-chain</span>
        </div>
        {isConnected ? (
          <button
            type="button"
            className={nexusGlassCta(
              side === "sell" ? "sell" : "buy",
              "inline-flex min-h-[52px] w-full items-center justify-center gap-2 text-base",
              amountNum > 0 && !loading && !swapPending && tradeOnChain,
            )}
            onClick={executeOnChainTrade}
            disabled={loading || swapPending || amountNum <= 0 || constitutionBlocked || !tradeOnChain}
          >
            {loading || swapPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : null}
            {constitutionBlocked ? "Permit DENY — buy blocked" : tradeOnChain ? `Sign ${side === "buy" ? "Buy" : "Sell"} in wallet` : "Not on BSC Testnet"}
          </button>
        ) : (
          <p className="text-center text-sm text-white/60">Connect wallet on {BSC_CHAIN_LABEL} to trade</p>
        )}
        {constitutionBlocked && (
          <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-100">
            {constitutionPayload?.permit.thesis ?? "Agent BUY did not earn a constitution permit."}
          </p>
        )}
        {error && <p className="text-sm text-rose-300">{error}</p>}
        {lastTx && lastTx.hash.startsWith("0x") && (
          <a
            href={bscExplorerTx(lastTx.hash)}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/15 text-sm font-medium text-emerald-100"
          >
            <ExternalLink className="h-4 w-4" />
            View on BscScan
          </a>
        )}
        <p className="text-center text-[11px] text-white/45">
          PancakeSwap V2 on {BSC_CHAIN_LABEL} · pay/receive tBNB · wallet signature required
        </p>
      </div>
    ) : null;

  const shell = (
    <div className={embedded ? "flex min-h-0 flex-1 flex-col overflow-hidden" : undefined}>
        {!embedded && <div className="arc-panel-stripe arc-panel-stripe-nexus" />}
        <div className={cn(embedded ? "shrink-0 px-1 pt-0.5" : "border-b border-white/[0.08] px-4 py-3")}>
          {!embedded && (
          <div className="nexus-trade-hub-header mb-3 flex flex-wrap items-center gap-3">
            <ArcIcon3d icon={NEXUS_TRADE_ICONS.trade} theme="nexus" size="md" />
            <div className="min-w-0 flex-1">
              <p className="arc-caption text-violet-300/85">Execution</p>
              <span className="text-base font-semibold text-white">{BSC_CHAIN_LABEL} · tBNB trades</span>
            </div>
            {agentLive && (
              <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                LIVE
              </span>
            )}
          </div>
          )}
          <div className="nexus-trade-tabs grid grid-cols-3 gap-2">
            {(
              [
                { id: "buy" as const, label: "Buy", icon: NEXUS_TRADE_ICONS.buy, theme: "nexus" as const },
                { id: "sell" as const, label: "Sell", icon: NEXUS_TRADE_ICONS.sell, theme: "prism" as const },
                { id: "agent" as const, label: "Autopilot", icon: NEXUS_TRADE_ICONS.autopilot, theme: "home" as const },
              ] as const
            ).map(({ id, label, icon: Icon, theme: iconTheme }) => (
              <button
                key={id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTab(id);
                }}
                className={nexusActionGlass(
                  id === "agent" ? "autopilot" : id,
                  tradeTab === id,
                  "nexus-trade-tab relative z-[1] flex min-h-[52px] flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2 active:scale-[0.98]",
                )}
              >
                <ArcIcon3d
                  icon={Icon}
                  theme={id === "agent" ? "home" : iconTheme}
                  size="sm"
                  delay={id === "agent" ? 0.15 : 0}
                  className="pointer-events-none scale-90"
                />
                <span className="text-[10px] font-bold">{label}</span>
              </button>
            ))}
          </div>
        </div>

      <div
        className={cn(
          embedded ? "nexus-trade-column-scroll min-h-0 flex-1 space-y-3 px-1 py-2" : "space-y-3 p-4",
        )}
      >
        {!trade && tradeTab !== "agent" ? (
          <p className="text-center text-sm text-white/60">Select a token from the feed to trade.</p>
        ) : (
          <>
            <div className={tradeTab !== "agent" ? "hidden" : "space-y-3"} aria-hidden={tradeTab !== "agent"}>
              {marketToken && (
                <div className="flex justify-end">
                  <NexusTokenChatButton token={marketToken} onOpenTrade={setTab} />
                </div>
              )}
              <NexusAutopilotPanel
                token={marketToken}
                catalogTokens={catalogTokens}
                onTradeComplete={onTradeComplete}
                embedded
                onAgentLiveChange={setAgentLive}
              />
            </div>
            {tradeTab !== "agent" && !trade ? (
              <p className="text-center text-sm text-white/60">Select a token from the feed to trade.</p>
            ) : tradeTab !== "agent" && trade ? (
          <div className="space-y-3 min-w-0">
            <div className="arc-glass-card arc-glass-card-nexus flex items-center justify-between gap-2 px-3 py-2.5">
              <div>
                <span className="text-lg font-bold text-white">{trade.symbol}</span>
                <span className="ml-2 font-mono text-sm tabular-nums text-cyan-100/90">
                  {formatTokenPrice(livePrice)}
                </span>
              </div>
              {marketToken && <NexusTokenChatButton token={marketToken} onOpenTrade={setTab} />}
            </div>
            <NexusTradeBalanceBar
              symbol={trade.symbol}
              onChainBalance={tokenBalance}
            />

              {tradeOnChainHint && (
                <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  {tradeOnChainHint}
                </p>
              )}

              <div>
                <p className="nexus-caption mb-2 flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-cyan-300" />
                  {side === "buy" ? "Spend (tBNB)" : `Sell (${trade.symbol})`}
                </p>
              </div>

              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="arc-input-glass w-full min-h-[48px] px-4 text-lg font-medium tabular-nums text-white"
                placeholder={side === "buy" ? "tBNB amount" : `${trade.symbol} amount`}
              />
              <p className="text-[11px] text-white/45">
                Wallet: {walletTbnb.toFixed(4)} tBNB on {BSC_CHAIN_LABEL}
              </p>

              {amountNum > 0 && livePrice > 0 && (
                <p className="text-[11px] text-white/50 tabular-nums">
                  {side === "buy"
                    ? `≈ ${formatTokenAmount(resolved.tokenAmount)} ${trade.symbol}`
                    : `≈ ${resolved.tbnbSpent.toFixed(4)} tBNB receive`}
                </p>
              )}
              <div className="grid grid-cols-4 gap-2">
                {PCT_OPTIONS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyPct(pct)}
                    className="arc-glass-interactive min-h-[44px] rounded-xl border border-violet-400/25 bg-violet-500/10 text-sm font-bold text-violet-100 transition active:scale-95 active:bg-violet-500/25"
                  >
                    {pct}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => applyPct(100)}
                  className="arc-glass-interactive min-h-[44px] rounded-xl border border-violet-400/35 bg-violet-500/20 text-sm font-bold text-violet-100 transition active:scale-95"
                >
                  MAX
                </button>
              </div>

              {side === "sell" && amountNum > 0 && livePrice > 0 && (
                <p className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-100">
                  Receive ≈ {(resolved.usdcAmount / bnbSpotUsd).toFixed(4)} tBNB · sell{" "}
                  {resolved.tokenAmount.toFixed(4)} {trade.symbol}
                </p>
              )}

              {quoteLabel && (
                <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white/85">
                  <p>{quoteLabel}</p>
                </div>
              )}

              {!embedded && tradeConfirmFooter}
            </div>
            ) : null}
          </>
        )}
      </div>
      {embedded && tradeConfirmFooter && (
        <div className="nexus-trade-confirm-footer shrink-0 border-t border-white/10 bg-[#080b12]/98 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          {tradeConfirmFooter}
        </div>
      )}
    </div>
  );

  return (
    <NexusAgentWalletProvider>
      {embedded ? (
        shell
      ) : (
        <div className="arc-panel arc-panel-nexus arc-border-trace arc-hover-lift overflow-hidden">{shell}</div>
      )}
    </NexusAgentWalletProvider>
  );
}

/** @deprecated use NexusTradeHub */
export const NexusDemoTradePanel = NexusTradeHub;
