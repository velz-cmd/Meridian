"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { Coins, DollarSign, ExternalLink, Loader2 } from "lucide-react";
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
import { buildDemoQuote } from "@/lib/demo-trading";
import { bscExplorerAddress, bscExplorerTx } from "@/lib/bsc-chain";
import { BSC_CHAIN_ID, BSC_CHAIN_LABEL } from "@/lib/bsc-chain";
import { formatPct, formatTokenPrice, formatUsd, truncateHash } from "@/lib/utils";
import type { NexusDecision, DemoPosition } from "@/lib/storage";

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

type AmountMode = "usdc" | "token";

const TRADE_NETWORK = "bsc" as const;
const BUY_PRESETS = [10, 25, 50, 100] as const;
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
  const { payBnbFee, ensureBscNetwork, isPending: bnbPending, feeUsd } = useBnbSettlement();
  const { data: balance } = useBalance({ address, chainId: BSC_CHAIN_ID });

  const setTab = (tab: TradeTab) => {
    if (activeTab === undefined) setInternalTab(tab);
    onTabChange?.(tab);
  };

  const trade = asTradeToken(token);
  const side = tradeTab === "sell" ? "sell" : "buy";
  const [amount, setAmount] = useState("25");
  const [amountMode, setAmountMode] = useState<AmountMode>("usdc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<{ hash: string; block?: number } | null>(null);
  const [position, setPosition] = useState<DemoPosition | null>(null);

  const usdcBalance = balance ? Number(balance.formatted) : 0;
  const tokenBalance = position?.tokenAmount ?? 0;

  useEffect(() => {
    setAmountMode(side === "buy" ? "usdc" : "token");
    setAmount(side === "buy" ? "25" : "0");
  }, [side, trade?.tokenAddress]);

  const loadPosition = useCallback(async () => {
    if (!address || !trade) return;
    const res = await fetch(`/api/nexus/demo/portfolio?wallet=${address}&t=${Date.now()}`, {
      cache: "no-store",
    });
    const data = await res.json();
    const pos = (data.positions ?? []).find(
      (p: DemoPosition) =>
        p.tokenAddress.toLowerCase() === trade.tokenAddress.toLowerCase() &&
        p.tradeNetwork === TRADE_NETWORK,
    );
    setPosition(pos ?? null);
  }, [address, trade]);

  useEffect(() => {
    void loadPosition();
  }, [loadPosition, lastTx]);

  const livePrice = trade?.priceUsd ?? 0;
  const unrealizedPnl =
    position && livePrice > 0 ? position.tokenAmount * livePrice - position.usdcSpent : null;
  const unrealizedPct =
    position && position.usdcSpent > 0 && unrealizedPnl != null
      ? (unrealizedPnl / position.usdcSpent) * 100
      : null;

  const amountNum = Math.max(0, Number(amount) || 0);

  const resolved = useMemo(() => {
    if (!trade || amountNum <= 0 || livePrice <= 0) {
      return { usdcAmount: 0, tokenAmount: 0 };
    }
    if (side === "buy") {
      if (amountMode === "usdc") {
        return { usdcAmount: amountNum, tokenAmount: amountNum / livePrice };
      }
      return { usdcAmount: amountNum * livePrice, tokenAmount: amountNum };
    }
    if (amountMode === "token") {
      return { usdcAmount: amountNum * livePrice, tokenAmount: amountNum };
    }
    return { usdcAmount: amountNum, tokenAmount: amountNum / livePrice };
  }, [trade, side, amountNum, livePrice, amountMode]);

  const quote = useMemo(() => {
    if (!trade || amountNum <= 0) return null;
    return buildDemoQuote({
      side,
      usdcAmount: side === "buy" ? resolved.usdcAmount : undefined,
      tokenAmount: side === "sell" ? resolved.tokenAmount : undefined,
      priceUsd: livePrice,
      position,
    });
  }, [trade, side, amountNum, livePrice, position, resolved]);

  function applyPct(pct: number) {
    if (side === "buy") {
      if (amountMode === "usdc") {
        const spend = (usdcBalance * pct) / 100;
        setAmount(formatAmount(Math.max(0, spend - feeUsd)));
      } else if (livePrice > 0) {
        const maxTokens = usdcBalance / livePrice;
        setAmount(formatAmount((maxTokens * pct) / 100));
      }
      return;
    }
    if (amountMode === "token") {
      setAmount(formatAmount((tokenBalance * pct) / 100));
    } else if (livePrice > 0) {
      setAmount(formatAmount(((tokenBalance * livePrice) * pct) / 100));
    }
  }

  function applyBuyPreset(usdc: number) {
    setTab("buy");
    setAmountMode("usdc");
    setAmount(String(usdc));
  }

  function applySellUsdcReceive(targetUsdc: number) {
    setAmountMode("usdc");
    setAmount(String(targetUsdc));
  }

  async function executeDemoTrade() {
    if (!trade || !address || amountNum <= 0) {
      setError("Enter an amount greater than 0");
      return;
    }
    if (side === "buy" && resolved.usdcAmount > usdcBalance) {
      setError(`Insufficient tBNB balance on ${BSC_CHAIN_LABEL}`);
      return;
    }
    if (side === "sell" && resolved.tokenAmount > tokenBalance + 1e-9) {
      setError(`Insufficient ${trade.symbol} — you have ${tokenBalance.toFixed(4)}`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await ensureBscNetwork();
      const fee = await payBnbFee(
        side.toUpperCase(),
        `${trade.tokenAddress}-${TRADE_NETWORK}-${side}-${amountNum}-${Date.now()}`,
      );

      const res = await fetch("/api/nexus/demo/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          side,
          symbol: trade.symbol,
          tokenAddress: trade.tokenAddress,
          sourceChain: trade.chainId,
          tradeNetwork: TRADE_NETWORK,
          usdcAmount: side === "buy" ? resolved.usdcAmount : undefined,
          tokenAmount: side === "sell" ? resolved.tokenAmount : undefined,
          priceUsd: livePrice,
          arcFeeTxHash: fee.txHash,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Demo trade failed");

      const pos = (data.positions ?? []).find(
        (p: DemoPosition) =>
          p.tokenAddress.toLowerCase() === trade.tokenAddress.toLowerCase() &&
          p.tradeNetwork === TRADE_NETWORK,
      );
      setPosition(pos ?? null);

      setLastTx({ hash: fee.txHash, block: fee.blockNumber });
      toast({
        type: "success",
        title: side === "buy" ? "Buy executed" : "Sell executed",
        message: quote?.label ?? `Demo ${side} recorded on ${BSC_CHAIN_LABEL}`,
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
        <div className="flex justify-between text-xs text-cyan-100/80">
          <span>Permit gate · wallet ready</span>
          <span className="font-semibold">Risk gated</span>
        </div>
        {isConnected ? (
          <button
            type="button"
            className={nexusGlassCta(
              side === "sell" ? "sell" : "buy",
              "inline-flex min-h-[52px] w-full items-center justify-center gap-2 text-base",
              amountNum > 0 && !loading && !bnbPending,
            )}
            onClick={executeDemoTrade}
            disabled={loading || bnbPending || amountNum <= 0 || constitutionBlocked}
          >
            {loading || bnbPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : null}
            {constitutionBlocked ? "Permit DENY — buy blocked" : `Confirm ${side === "buy" ? "Buy" : "Sell"}`}
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
          Demo fills · permit gate · live market pricing
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
              <span className="text-base font-semibold text-white">{BSC_CHAIN_LABEL} Trade · Agent</span>
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
          <>
            <div className="arc-glass-card arc-glass-card-nexus flex items-center justify-between gap-2 px-3 py-2.5">
              <div>
                <span className="text-lg font-bold text-white">{trade.symbol}</span>
                <span className="ml-2 font-mono text-sm tabular-nums text-cyan-100/90">
                  {formatTokenPrice(livePrice)}
                </span>
              </div>
              {marketToken && <NexusTokenChatButton token={marketToken} onOpenTrade={setTab} />}
            </div>
            <NexusTradeBalanceBar symbol={trade.symbol} position={position} />

              {position && position.tokenAmount > 0 && unrealizedPnl != null && (
                <div
                  className={`rounded-xl border px-3 py-2.5 text-sm ${
                    unrealizedPnl >= 0
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                      : "border-rose-400/30 bg-rose-500/10 text-rose-100"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {position.tokenAmount.toFixed(4)} {trade.symbol}
                    </span>
                    <span className="flex items-center gap-1 font-semibold">
                      {unrealizedPnl >= 0 ? (
                        <NEXUS_TRADE_ICONS.buy className="h-4 w-4" />
                      ) : (
                        <NEXUS_TRADE_ICONS.sell className="h-4 w-4" />
                      )}
                      {formatUsd(unrealizedPnl)}
                      {unrealizedPct != null && ` (${formatPct(unrealizedPct)})`}
                    </span>
                  </div>
                </div>
              )}

              {side === "buy" && (
                <div>
                  <p className="nexus-caption mb-2 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-300" />
                    Quick spend (tBNB)
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {BUY_PRESETS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => applyBuyPreset(v)}
                        className="min-h-[40px] rounded-lg border border-emerald-400/20 bg-emerald-500/10 text-sm font-medium text-emerald-100 active:bg-emerald-500/20"
                      >
                        ${v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {side === "sell" && (
                <div>
                  <p className="nexus-caption mb-2 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-rose-300" />
                    Quick receive (tBNB)
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {BUY_PRESETS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => applySellUsdcReceive(v)}
                        className="arc-glass-interactive min-h-[40px] rounded-lg border border-rose-400/20 bg-rose-500/10 text-sm font-medium text-rose-100 active:bg-rose-500/20"
                      >
                        ${v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="nexus-caption flex items-center gap-1.5">
                  {amountMode === "usdc" ? (
                    <DollarSign className="h-3.5 w-3.5 text-emerald-300" />
                  ) : (
                    <Coins className="h-3.5 w-3.5 text-cyan-300" />
                  )}
                  {side === "buy" ? "Buy amount" : "Sell amount"}
                </p>
                <div className="inline-flex rounded-lg border border-white/15 p-0.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setAmountMode("token")}
                    className={`rounded-md px-2.5 py-1 transition ${
                      amountMode === "token" ? "bg-cyan-500/25 text-cyan-100" : "text-white/50"
                    }`}
                  >
                    {trade.symbol}
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
              </div>

              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="arc-input-glass w-full min-h-[48px] px-4 text-lg font-medium text-white"
                placeholder={amountMode === "usdc" ? "tBNB amount" : `${trade.symbol} amount`}
              />

              {amountNum > 0 && livePrice > 0 && (
                <p className="text-[11px] text-white/50">
                  {side === "buy" ? "≈ " : "≈ "}
                  {amountMode === "usdc"
                    ? `${resolved.tokenAmount.toFixed(4)} ${trade.symbol}`
                    : `${resolved.usdcAmount.toFixed(4)} tBNB`}
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
                  Receive ≈ {resolved.usdcAmount.toFixed(4)} tBNB · sell {resolved.tokenAmount.toFixed(4)}{" "}
                  {trade.symbol}
                </p>
              )}

              {quote && (
                <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white/85">
                  <p>{quote.label}</p>
                  {"pnlUsd" in quote && quote.pnlUsd !== undefined && (
                    <p className={`mt-1 font-semibold ${quote.pnlUsd >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      Est. P&L {formatUsd(quote.pnlUsd)}
                    </p>
                  )}
                </div>
              )}

              {!embedded && tradeConfirmFooter}
            </>
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
