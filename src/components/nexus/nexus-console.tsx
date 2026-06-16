"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { LineChart, Radio, Sparkles } from "lucide-react";
import { nexusActionGlass } from "@/lib/nexus-action-glass";
import { NEXUS_TRADE_ICONS } from "@/lib/nexus-trade-icons";
import { ArcBackground } from "@/components/layout/arc-background";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { ArcPanel } from "@/components/ui/arc-panel";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";
import { NexusPremiumHero } from "@/components/nexus/nexus-premium-hero";
import { NexusAlphaHero } from "@/components/nexus/nexus-alpha-hero";
import { CommunityPulsePanel } from "@/components/shared/community-pulse-panel";
import type { CommunityPulse } from "@/lib/community-pulse";
import { NexusAlphaList } from "@/components/nexus/nexus-alpha-list";
import type { AlphaOpportunity } from "@/lib/nexus-agent";
import type { AlphaScanIntel } from "@/lib/alpha-scan-engine";
import { STABLE_FEED_LIMIT, ALPHA_SCAN_LIMIT } from "@/lib/feed-config";
import { ALPHA_SCAN_ERROR_TIP, ALPHA_SCAN_SUCCESS } from "@/lib/nexus-copy";
import { symbolChainKey, tokenKey } from "@/lib/feed-curation";
import { NexusQuickSwap } from "@/components/nexus/nexus-quick-swap";
import { filterTradableTokens, isStablecoin } from "@/lib/token-filters";
import { NexusTokenChart } from "@/components/nexus/nexus-token-chart";
import { ArcSettlementBanner } from "@/components/nexus/arc-settlement-banner";
import { NexusTrendingFeed, type TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { NexusAgentWalletProvider } from "@/components/nexus/nexus-agent-wallet-provider";
import { NexusTradeHub } from "@/components/nexus/nexus-demo-trade-panel";
import { NexusPortfolio } from "@/components/nexus/nexus-portfolio";
import { NexusTokenDetectPanel } from "@/components/nexus/nexus-token-detect-panel";
import {
  NexusResearchDossierDeep,
  NexusResearchDossierLive,
} from "@/components/nexus/nexus-research-dossier";
import { NexusIntelCollapsibles } from "@/components/nexus/nexus-intel-collapsibles";
import { NexusAgentReasoningStrip } from "@/components/nexus/nexus-agent-reasoning-strip";
import { NexusConvictionGate } from "@/components/nexus/nexus-conviction-gate";
import { useConvictionGate } from "@/hooks/use-conviction-gate";
import { useTokenDossier } from "@/hooks/use-token-dossier";
import { useLiveTokenQuote, type LiveTokenQuote } from "@/hooks/use-live-token-quote";
import { NexusIntegrationsBanner } from "@/components/nexus/nexus-integrations-banner";
import { NexusFeedTabs, type NexusFeedTab } from "@/components/nexus/nexus-feed-tabs";
import { NexusMobileDock, type NexusMobilePanel } from "@/components/nexus/nexus-mobile-dock";
import { NexusMobileContextBar } from "@/components/nexus/nexus-mobile-context-bar";
import { NexusMobileTokenActions } from "@/components/nexus/nexus-mobile-token-actions";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { CircleAgentsFooter } from "@/components/layout/circle-agents-footer";
import { NexusCircleAgentsTopBanner } from "@/components/nexus/nexus-circle-agents-banner";
import { MeridianFooter } from "@/components/layout/meridian-footer";
import { meridianClientHeaders } from "@/lib/circle-agents";
import { NexusTokenStrip } from "@/components/nexus/nexus-token-strip";
import { NexusCenterTokenHeader } from "@/components/nexus/nexus-center-token-header";
import { NexusTokenChatButton } from "@/components/nexus/nexus-token-chat";
import { useToast } from "@/components/ui/toast-provider";
import { useArcSettlement } from "@/hooks/use-arc-settlement";
import { dedupeFeedTokens } from "@/lib/feed-curation";
import { mergeFeedTokensStable } from "@/lib/token-security";
import type { NexusDecision } from "@/lib/storage";
import { cn } from "@/lib/utils";

function tokenToDecision(token: TrendingMarketToken): NexusDecision | null {
  if (!token.agent) return null;
  return {
    id: `${token.chainId}:${token.tokenAddress}`,
    timestamp: token.updatedAt ?? new Date().toISOString(),
    token: token.tokenAddress,
    symbol: token.symbol,
    name: token.name,
    chainId: token.chainId,
    pairAddress: token.pairAddress,
    dexUrl: token.url,
    icon: token.icon,
    priceUsd: token.priceUsd,
    change24h: token.change24h,
    volume24h: token.volume24h,
    liquidityUsd: token.liquidityUsd,
    intel: token.intel ?? {},
    swappable: true,
    technical: token.intel?.technical,
    ...token.agent,
  };
}

export function NexusConsole() {
  const toast = useToast();
  const { isConnected } = useAccount();
  const walletChainId = useChainId();
  const { payArcFee, ensureArcNetwork, isPending: arcFeePending, feeUsd } = useArcSettlement();
  const [lastArcFeeTx, setLastArcFeeTx] = useState<string | null>(null);
  const [portfolioKey, setPortfolioKey] = useState(0);

  const [selectedToken, setSelectedToken] = useState<TrendingMarketToken | null>(null);
  const [intelTier, setIntelTier] = useState<"feed" | "alpha">("feed");
  const [alphaThesis, setAlphaThesis] = useState<string | undefined>(undefined);
  const [alphaScanning, setAlphaScanning] = useState(false);
  const [alphaScanError, setAlphaScanError] = useState<string | null>(null);
  const [alphaOpportunities, setAlphaOpportunities] = useState<AlphaOpportunity[]>([]);
  const [alphaScanIntel, setAlphaScanIntel] = useState<AlphaScanIntel | null>(null);
  const [feedTab, setFeedTab] = useState<NexusFeedTab>("live");
  const [rightTab, setRightTab] = useState<"trade" | "portfolio">("trade");
  const [mobilePanel, setMobilePanel] = useState<NexusMobilePanel>("feed");
  const [tradeTab, setTradeTab] = useState<"buy" | "sell" | "agent">("buy");
  const [chartFullscreen, setChartFullscreen] = useState(false);
  const [actionBanner, setActionBanner] = useState<{
    title: string;
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);
  const [feedTokens, setFeedTokens] = useState<TrendingMarketToken[]>([]);
  const [communityPulse, setCommunityPulse] = useState<CommunityPulse | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#nexus-conviction-gate") return;
    const el = document.getElementById("nexus-conviction-gate");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedToken?.tokenAddress]);

  useEffect(() => {
    try {
      localStorage.removeItem("nexus-agent-memory");
      localStorage.removeItem("nexus-saved-scans");
    } catch {
      /* ignore */
    }
  }, []);

  const displayDecision = selectedToken ? tokenToDecision(selectedToken) : null;
  const tokenDossier = useTokenDossier(selectedToken, intelTier);
  const deskAgent = tokenDossier.payload?.agent ?? selectedToken?.agent;
  const conviction = useConvictionGate(selectedToken, deskAgent);

  const applyLiveQuote = useCallback((quote: LiveTokenQuote) => {
    const addr = quote.tokenAddress.toLowerCase();
    const mergeQuote = (t: TrendingMarketToken): TrendingMarketToken => ({
      ...t,
      priceUsd: quote.priceUsd,
      change24h: quote.change24h ?? t.change24h,
      volume24h: quote.volume24h ?? t.volume24h,
      liquidityUsd: quote.liquidityUsd ?? t.liquidityUsd,
      marketCap: quote.marketCap ?? t.marketCap,
      fdv: quote.fdv ?? t.fdv,
      pairAddress: quote.pairAddress || t.pairAddress,
      url: quote.url || t.url,
      txns24h: quote.txns24h ?? t.txns24h,
      priceChange: quote.priceChange ?? t.priceChange,
    });
    setSelectedToken((prev) => {
      if (!prev || prev.tokenAddress.toLowerCase() !== addr || prev.chainId !== quote.chainId) return prev;
      return mergeQuote(prev);
    });
    setFeedTokens((prev) =>
      prev.map((t) =>
        t.tokenAddress.toLowerCase() === addr && t.chainId === quote.chainId ? mergeQuote(t) : t,
      ),
    );
  }, []);

  useLiveTokenQuote(selectedToken, applyLiveQuote);

  useEffect(() => {
    const p = tokenDossier.payload;
    if (!p?.agent || !selectedToken) return;
    setSelectedToken((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        agent: p.agent ?? prev.agent,
        intel: {
          ...prev.intel,
          technical: p.technical ?? prev.intel?.technical,
        },
      };
    });
  }, [tokenDossier.payload?.fetchedAt, selectedToken?.tokenAddress, selectedToken?.chainId]);

  useEffect(() => {
    const pulse = tokenDossier.payload?.community;
    if (pulse?.items?.length) {
      setCommunityPulse(pulse);
    } else if (!tokenDossier.loading && selectedToken) {
      setCommunityPulse(null);
    }
  }, [tokenDossier.payload?.community, tokenDossier.loading, selectedToken?.tokenAddress]);

  const scrollToMobileContent = useCallback(() => {
    requestAnimationFrame(() => {
      document.getElementById("nexus-mobile-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const openChartView = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setMobilePanel("chart");
      scrollToMobileContent();
      return;
    }
    requestAnimationFrame(() => {
      document.getElementById("nexus-chart-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [scrollToMobileContent]);

  const openTradePanel = useCallback(
    (tab: "buy" | "sell" | "agent") => {
      setTradeTab(tab);
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
        setMobilePanel("trade");
        scrollToMobileContent();
        return;
      }
      requestAnimationFrame(() => {
        document.getElementById("nexus-trade-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    },
    [scrollToMobileContent],
  );

  const handleTokenSelect = useCallback(
    (token: TrendingMarketToken, openChart = true) => {
      setIntelTier("feed");
      setAlphaThesis(undefined);
      const key = tokenKey(token);
      const fromFeed = feedTokens.find((t) => tokenKey(t) === key);
      setSelectedToken(
        fromFeed
          ? {
              ...fromFeed,
              ...token,
              pairAddress: fromFeed.pairAddress || token.pairAddress,
              url: fromFeed.url || token.url,
              agent: token.agent ?? fromFeed.agent,
              intel: token.intel ?? fromFeed.intel,
            }
          : token,
      );
      if (openChart) openChartView();
    },
    [openChartView, feedTokens],
  );

  const handleMobilePanel = useCallback(
    (panel: NexusMobilePanel) => {
      setMobilePanel(panel);
      scrollToMobileContent();
    },
    [scrollToMobileContent],
  );

  const handleFeedRefresh = useCallback((tokens: TrendingMarketToken[]) => {
    const tradable = filterTradableTokens(tokens);
    const feedExcluded = (t: TrendingMarketToken) =>
      isStablecoin(t.symbol, t.name, {
        tokenAddress: t.tokenAddress,
        chainId: t.chainId,
        priceUsd: t.priceUsd,
        change24h: t.change24h,
      });
    setFeedTokens((prev) =>
      dedupeFeedTokens(mergeFeedTokensStable(prev, tradable, STABLE_FEED_LIMIT, feedExcluded)),
    );
    setSelectedToken((prev) => {
      if (!prev) return tradable[0] ?? null;
      if (
        isStablecoin(prev.symbol, prev.name, {
          tokenAddress: prev.tokenAddress,
          chainId: prev.chainId,
          priceUsd: prev.priceUsd,
          change24h: prev.change24h,
        })
      ) {
        return tradable[0] ?? null;
      }
      const match = tradable.find(
        (t) =>
          t.tokenAddress.toLowerCase() === prev.tokenAddress.toLowerCase() &&
          t.chainId === prev.chainId,
      );
      if (!match) return tradable[0] ?? prev;
      return {
        ...match,
        security: match.security ?? prev.security,
        intel: { ...match.intel, ...prev.intel },
      };
    });
    setPortfolioKey((k) => k + 1);
  }, []);

  const livePrices = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of feedTokens) {
      if (t.tokenAddress && t.priceUsd > 0) map[t.tokenAddress.toLowerCase()] = t.priceUsd;
    }
    if (selectedToken?.tokenAddress && selectedToken.priceUsd > 0) {
      map[selectedToken.tokenAddress.toLowerCase()] = selectedToken.priceUsd;
    }
    return map;
  }, [feedTokens, selectedToken?.tokenAddress, selectedToken?.priceUsd]);

  const handleBirdeyeIntel = useCallback((summary: {
    holderCount?: number;
    sniperCount?: number;
    whaleCount?: number;
    insiderCount?: number;
    top10Pct?: number;
  }) => {
    setSelectedToken((prev) => {
      if (!prev) return prev;
      const { top10Pct, ...rest } = summary;
      return {
        ...prev,
        intel: {
          ...prev.intel,
          ...rest,
          top10HolderPercent: top10Pct ?? prev.intel?.top10HolderPercent,
        },
      };
    });
  }, []);

  async function payOptionalArcFee(action: string, payload: string): Promise<string | undefined> {
    try {
      await ensureArcNetwork();
      const fee = await payArcFee(action, payload);
      setLastArcFeeTx(fee.txHash);
      return fee.txHash;
    } catch (err) {
      const msg = (err instanceof Error ? err.message : "").toLowerCase();
      if (
        msg.includes("reject") ||
        msg.includes("denied") ||
        msg.includes("cancel") ||
        msg.includes("insufficient") ||
        msg.includes("failed on-chain")
      ) {
        toast({
          type: "info",
          title: "Arc fee skipped",
          message: "Scan continues without on-chain fee — use Arc testnet for full settlement.",
          durationMs: 10_000,
        });
        return undefined;
      }
      throw err;
    }
  }

  async function runAlphaScan() {
    setAlphaScanning(true);
    setAlphaScanError(null);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 118_000);
    try {
      if (!isConnected) throw new Error("Connect wallet on Arc Testnet to scan");
      const arcFeeTxHash = await payOptionalArcFee("ALPHA", `alpha-${Date.now()}`);

      const res = await fetch("/api/nexus/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...meridianClientHeaders() },
        body: JSON.stringify({
          mode: "alpha",
          walletChainId,
          arcFeeTxHash,
          chainId: selectedToken?.chainId,
          tokenAddress: selectedToken?.tokenAddress,
          liveFeedKeys: feedTokens.map((t) => tokenKey(t)),
          liveFeedSymbolKeys: feedTokens.map((t) => symbolChainKey(t)),
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        const hint = typeof data.hint === "string" ? ` ${data.hint}` : "";
        throw new Error(`${data.error ?? "Alpha scan failed"}${hint}`);
      }

      const rows = filterTradableTokens((data.opportunities ?? []) as AlphaOpportunity[]);
      if (rows.length === 0) throw new Error("Alpha scan returned 0 tradable tokens (stablecoins excluded)");

      setAlphaOpportunities(rows);
      setAlphaScanIntel((data.scanIntel as AlphaScanIntel | undefined) ?? null);
      setFeedTab("alpha");
      setMobilePanel("feed");
      scrollToMobileContent();
      const topBuy = rows.find((r) => r.action === "BUY");
      const sentiment = (data.scanIntel as AlphaScanIntel | undefined)?.marketSentiment;
      setActionBanner({
        type: "success",
        title: "Alpha scan complete",
        message: ALPHA_SCAN_SUCCESS(rows.length, topBuy?.symbol, sentiment?.label),
      });
      toast({
        type: "success",
        title: "Alpha scan complete",
        message: ALPHA_SCAN_SUCCESS(rows.length, topBuy?.symbol, sentiment?.label),
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.name === "AbortError"
          ? "Scan took too long. Try again in a moment."
          : err instanceof Error
            ? err.message.replace(/GMGN|6551|Birdeye|ApeWisdom|DexScreener/gi, "data feed")
            : "Could not complete Alpha scan";
      setAlphaScanError(msg);
      setActionBanner({
        type: "error",
        title: "Alpha scan incomplete",
        message: `${msg} ${ALPHA_SCAN_ERROR_TIP}`,
      });
      toast({
        type: "error",
        title: "Alpha scan incomplete",
        message: msg,
        durationMs: 15_000,
      });
    } finally {
      window.clearTimeout(timer);
      setAlphaScanning(false);
    }
  }

  function selectAlphaRow(row: AlphaOpportunity) {
    setIntelTier("alpha");
    setAlphaThesis(row.aiThesis ?? row.researchGlance ?? row.whyAction);
    const key = `${row.chainId}:${row.tokenAddress.toLowerCase()}`;
    const feedHit = feedTokens.find((t) => tokenKey(t) === key);
    setSelectedToken({
      symbol: row.symbol,
      name: row.name,
      tokenAddress: row.tokenAddress,
      chainId: row.chainId,
      pairAddress: feedHit?.pairAddress ?? "",
      priceUsd: row.priceUsd,
      change24h: row.change24h,
      volume24h: row.volume24h,
      liquidityUsd: row.liquidityUsd,
      icon: row.icon,
      url: feedHit?.url ?? "",
      agent: {
        action: row.action,
        confidence: row.confidence,
        riskScore: row.riskScore,
        reasoning: row.aiThesis || row.reasoning,
        whyAction: row.whyAction ?? row.researchGlance,
        reasoningFactors: row.reasoningFactors ?? [],
      },
    });
    openChartView();
  }

  const feedPanel = (
    <div className="nexus-feed-panel flex min-h-0 flex-1 flex-col max-lg:!border-0 max-lg:!bg-transparent max-lg:min-h-0">
      <NexusFeedTabs active={feedTab} onChange={setFeedTab} alphaCount={alphaOpportunities.length} />
      <div className="flex min-h-0 flex-1 flex-col max-lg:min-h-0 lg:min-h-0">
        {feedTab === "live" && (
          <NexusTrendingFeed
            className="lg:h-full lg:min-h-0"
            cleanFeed
            selectedAddress={selectedToken?.tokenAddress}
            onSelect={(t, opts) => handleTokenSelect(t, opts?.openChart ?? true)}
            onTokensRefresh={handleFeedRefresh}
            onOpenTrade={(tab) => {
              setTradeTab(tab);
              setRightTab("trade");
              setMobilePanel("trade");
              scrollToMobileContent();
            }}
          />
        )}
        {feedTab === "alpha" && (
          <div className="nexus-feed-scroll min-h-0 flex-1 overflow-y-auto pr-1 max-lg:overflow-visible max-lg:flex-none">
            <NexusAlphaList
              opportunities={alphaOpportunities}
              scanIntel={alphaScanIntel}
              selectedAddress={selectedToken?.tokenAddress}
              onSelect={selectAlphaRow}
              scanning={alphaScanning}
              scanError={alphaScanError}
            />
          </div>
        )}
        {feedTab === "swap" && (
          <div className="nexus-feed-scroll min-h-0 flex-1 overflow-y-auto pr-1 max-lg:overflow-visible max-lg:flex-none">
            <NexusQuickSwap
              tokens={feedTokens}
              alphaTokens={alphaOpportunities}
              onComplete={() => setPortfolioKey((k) => k + 1)}
            />
          </div>
        )}
      </div>
    </div>
  );

  const chartPanel = !selectedToken ? (
    <div className="arc-signal-panel arc-signal-panel-nexus flex flex-col items-center justify-center gap-3 px-4 py-12 text-center lg:py-16">
      <ArcIcon3d icon={LineChart} theme="nexus" size="lg" />
      <p className="text-sm text-[var(--arc-text-muted)]">Select a token from the feed to view chart &amp; analysis.</p>
    </div>
  ) : (
    <div className="nexus-center-layout flex min-h-0 flex-1 flex-col overflow-hidden max-lg:overflow-visible max-lg:pb-4">
      <div className="nexus-center-toolbar shrink-0 space-y-2 lg:space-y-2.5 lg:border-b lg:border-white/[0.06] lg:pb-2">
        <NexusCenterTokenHeader
          token={selectedToken}
          decision={displayDecision}
          onOpenAutopilot={() => openTradePanel("agent")}
          actions={
            <>
              <button
                type="button"
                onClick={() => openTradePanel("buy")}
                className={nexusActionGlass(
                  "buy",
                  tradeTab === "buy",
                  "relative z-[1] hidden min-h-[40px] items-center gap-2 rounded-xl px-3 text-xs font-bold lg:inline-flex",
                )}
              >
                <ArcIcon3d icon={NEXUS_TRADE_ICONS.buy} theme="nexus" size="sm" className="!h-7 !w-7" />
                Buy
              </button>
              <button
                type="button"
                onClick={() => openTradePanel("sell")}
                className={nexusActionGlass(
                  "sell",
                  tradeTab === "sell",
                  "relative z-[1] hidden min-h-[40px] items-center gap-2 rounded-xl px-3 text-xs font-bold lg:inline-flex",
                )}
              >
                <ArcIcon3d icon={NEXUS_TRADE_ICONS.sell} theme="prism" size="sm" className="!h-7 !w-7" />
                Sell
              </button>
              <NexusTokenChatButton
                token={selectedToken}
                onOpenTrade={openTradePanel}
                className="!border-white/20 !bg-white/5 !text-white/70"
              />
            </>
          }
        />
        <NexusTokenStrip
          tokens={feedTokens}
          selected={selectedToken}
          onSelect={(t) => handleTokenSelect(t)}
          mobileLimit={STABLE_FEED_LIMIT}
          compact
        />
        <NexusMobileTokenActions
          token={selectedToken}
          onTradeTab={openTradePanel}
          onOpenAutopilot={() => openTradePanel("agent")}
          activeTab={tradeTab}
        />
      </div>

      <div className="nexus-center-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-0.5 pr-1 max-lg:overflow-visible max-lg:flex-none">
        <div id="nexus-chart-panel" className="nexus-center-chart shrink-0">
          <NexusTokenChart
            compact
            chainId={selectedToken.chainId}
            pairAddress={selectedToken.pairAddress}
            tokenAddress={selectedToken.tokenAddress}
            symbol={selectedToken.symbol}
            fullscreenOpen={chartFullscreen}
            onFullscreenChange={setChartFullscreen}
          />
        </div>

        <NexusAgentReasoningStrip
          token={selectedToken}
          payload={tokenDossier.payload}
          loading={tokenDossier.loading}
          tier={intelTier}
          alphaThesis={alphaThesis}
        />
        <NexusConvictionGate
          symbol={selectedToken.symbol}
          agent={deskAgent}
          data={conviction.data}
          loading={conviction.loading}
          error={conviction.error}
        />
        {tokenDossier.error && !tokenDossier.loading && (
          <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            {tokenDossier.error}
          </p>
        )}
        <NexusIntelCollapsibles
          token={selectedToken}
          payload={tokenDossier.payload}
          loading={tokenDossier.loading}
          reasoningInStrip
        />
        <NexusResearchDossierLive
          token={selectedToken}
          payload={tokenDossier.payload}
          loading={tokenDossier.loading}
          error={tokenDossier.error}
          holdersOnly
        />
        <NexusResearchDossierDeep dossier={tokenDossier.payload?.dossier} loading={tokenDossier.loading} />
        <NexusTokenDetectPanel
          chainId={selectedToken.chainId}
          tokenAddress={selectedToken.tokenAddress}
          symbol={selectedToken.symbol}
          txns24h={selectedToken.txns24h}
          volume24h={selectedToken.volume24h}
          agentAction={displayDecision?.action}
          onIntelUpdate={handleBirdeyeIntel}
        />
        {communityPulse && communityPulse.items.length > 0 && (
          <NexusCollapsible
            label={`Community · ${communityPulse.topic}`}
            hint={`${communityPulse.items.length} pulse items`}
            variant="intel"
            icon={Radio}
            defaultOpen={false}
            showCollapseHint
          >
            <CommunityPulsePanel pulse={communityPulse} compact />
          </NexusCollapsible>
        )}
      </div>
    </div>
  );

  const tradePanel = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden max-lg:overflow-visible max-lg:pb-4">
      <div className="lg:hidden mb-2 shrink-0 space-y-2">
        <NexusTokenStrip
          tokens={feedTokens}
          selected={selectedToken}
          onSelect={(t) => handleTokenSelect(t)}
          mobileLimit={STABLE_FEED_LIMIT}
        />
        {selectedToken && (
          <NexusMobileTokenActions
            token={selectedToken}
            onTradeTab={openTradePanel}
            onOpenAutopilot={() => openTradePanel("agent")}
            activeTab={tradeTab}
          />
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <NexusTradeHub
          embedded
          token={selectedToken}
          catalogTokens={feedTokens}
          activeTab={tradeTab}
          onTabChange={setTradeTab}
          onTradeComplete={() => setPortfolioKey((k) => k + 1)}
        />
      </div>
    </div>
  );

  const portfolioPanel = (
    <div className="nexus-feed-scroll min-h-0 flex-1 overflow-y-auto p-1 max-lg:overflow-visible max-lg:flex-none max-lg:pb-4">
      <NexusPortfolio
        refreshKey={portfolioKey}
        livePrices={livePrices}
        feedTokens={feedTokens}
        showTxHistory
      />
    </div>
  );

  const rightColumnPanel = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-2 flex shrink-0 gap-1.5 border-b border-white/[0.06] pb-2">
        <button
          type="button"
          onClick={() => setRightTab("trade")}
          className={cn(
            "arc-btn-pill flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-semibold",
            rightTab === "trade" ? "arc-nav-pill-active text-emerald-50" : "text-white/50",
          )}
        >
          <ArcIcon3d icon={NEXUS_TRADE_ICONS.trade} theme="nexus" size="sm" className="!h-8 !w-8" />
          Trade
        </button>
        <button
          type="button"
          onClick={() => setRightTab("portfolio")}
          className={cn(
            "arc-btn-pill flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-semibold",
            rightTab === "portfolio"
              ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-100"
              : "text-white/50",
          )}
        >
          <ArcIcon3d icon={NEXUS_TRADE_ICONS.portfolio} theme="nexus" size="sm" className="!h-8 !w-8" />
          Portfolio
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {rightTab === "trade" ? tradePanel : portfolioPanel}
      </div>
    </div>
  );

  return (
    <NexusAgentWalletProvider>
    <div className="relative min-h-screen text-white" data-nexus-page data-nexus-easy-mode data-arc-theme="nexus">
      <ArcBackground theme="nexus" />

      <div className="relative mx-auto w-full max-w-[1920px] px-3 py-2 pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:px-4 lg:py-8 lg:pb-8 xl:px-6">
        <NexusCircleAgentsTopBanner />
        <NexusAlphaHero
          onAlphaScan={() => void runAlphaScan()}
          alphaScanning={alphaScanning}
          alphaCount={alphaOpportunities.length}
          disabled={arcFeePending}
        />
        <div className="hidden lg:block">
          <NexusPremiumHero stableCount={STABLE_FEED_LIMIT} />
        </div>

        <NexusMobileContextBar selectedToken={selectedToken} />

        <ArcSettlementBanner txHash={lastArcFeeTx ?? undefined} />
        {actionBanner && (
          <div
            className={cn(
              "arc-glass-card mb-4 flex flex-wrap items-start justify-between gap-3 px-4 py-3",
              actionBanner.type === "success" && "arc-glass-card-nexus border-emerald-400/35",
              actionBanner.type === "error" && "border-rose-400/35 bg-rose-500/10",
              actionBanner.type === "info" && "arc-glass-card-nexus",
            )}
          >
            <div>
              <p className="text-sm font-semibold text-white">{actionBanner.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/75">{actionBanner.message}</p>
            </div>
            <button
              type="button"
              className="text-xs text-white/50 underline"
              onClick={() => setActionBanner(null)}
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="mb-3">
          <NexusIntegrationsBanner />
        </div>

        <div
          id="nexus-mobile-content"
          className="nexus-mobile-panel scroll-mt-36 max-lg:overflow-visible max-lg:pb-2 lg:hidden"
        >
          {mobilePanel === "feed" && feedPanel}
          {mobilePanel === "chart" && chartPanel}
          {mobilePanel === "trade" && tradePanel}
          {mobilePanel === "portfolio" && portfolioPanel}
        </div>

        <div
          className="hidden items-stretch gap-4 lg:grid lg:gap-5 xl:gap-6"
          data-nexus-layout="desktop"
        >
          <div className="nexus-column-shell nexus-column-panel arc-panel arc-panel-nexus arc-border-trace arc-hover-lift flex h-[min(720px,calc(100vh-5.5rem))] min-h-0 min-w-0 flex-col overflow-hidden lg:sticky lg:top-[4.75rem]">
            <div className="arc-panel-stripe arc-panel-stripe-nexus" />
            <div className="nexus-column-head shrink-0 border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <ArcIcon3d icon={Radio} theme="nexus" size="sm" delay={0} />
                <div>
                  <p className="arc-caption text-emerald-300/80">Discovery</p>
                  <p className="text-sm font-semibold text-white">Market feed</p>
                </div>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2 lg:px-3">
              {feedPanel}
            </div>
          </div>
          <div
            id="nexus-chart-panel"
            className="nexus-column-shell nexus-center-panel nexus-column-panel arc-panel arc-panel-nexus arc-border-trace arc-hover-lift flex h-[min(720px,calc(100vh-5.5rem))] min-h-0 min-w-0 flex-col overflow-hidden lg:sticky lg:top-[4.75rem]"
          >
            <div className="arc-panel-stripe arc-panel-stripe-nexus" />
            <div className="nexus-column-head shrink-0 border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <ArcIcon3d icon={LineChart} theme="nexus" size="sm" delay={0.05} />
                <div>
                  <p className="arc-caption text-violet-300/80">Token intelligence</p>
                  <p className="text-sm font-semibold text-white">Chart · agent reasoning · TA</p>
                </div>
              </div>
            </div>
            <div className="arc-panel-body flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3 lg:px-4">
              {chartPanel}
            </div>
          </div>
          <div
            id="nexus-trade-panel"
            className="nexus-column-shell nexus-column-panel arc-panel arc-panel-nexus arc-border-trace arc-hover-lift flex h-[min(720px,calc(100vh-5.5rem))] min-h-0 min-w-0 flex-col overflow-hidden lg:sticky lg:top-[4.75rem]"
          >
            <div className="arc-panel-stripe arc-panel-stripe-nexus" />
            <div className="nexus-column-head shrink-0 border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <ArcIcon3d icon={NEXUS_TRADE_ICONS.trade} theme="nexus" size="sm" delay={0.1} />
                <div>
                  <p className="arc-caption text-cyan-300/80">Wallet</p>
                  <p className="text-sm font-semibold text-white">Trade &amp; portfolio</p>
                </div>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2 lg:px-3">
              {rightColumnPanel}
            </div>
          </div>
        </div>

        <NexusMobileDock active={mobilePanel} onChange={handleMobilePanel} />
        <CircleAgentsFooter className="pb-1 pt-2" />
        <MeridianFooter className="hidden pb-3 pt-1 lg:block" />
      </div>
    </div>
    </NexusAgentWalletProvider>
  );
}
