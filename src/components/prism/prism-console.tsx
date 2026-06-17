"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Brain, History, Radar, Target, X } from "lucide-react";
import { useBnbSettlement } from "@/hooks/use-bnb-settlement";
import { PRISM_FORECAST_FEE_USD } from "@/lib/arc-chain";
import { arcExplorerTx } from "@/lib/arc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArcBackground } from "@/components/layout/arc-background";
import { cn, truncateHash } from "@/lib/utils";
import type { PrismMacroSnapshot } from "@/lib/prism-macro-snapshot";
import { filterIntelForEvent, mergeIntelSources, type PrismIntelStatus } from "@/lib/prism-intel-filter";
import type { PrismEngineContext, ScoredHeadline } from "@/lib/prism-intelligence-engine";
import { MACRO_EVENTS } from "@/lib/gdelt";
import type { PrismPrediction } from "@/lib/storage";
import type { CommunityPulse } from "@/lib/community-pulse";
import { CommunityPulsePanel } from "@/components/shared/community-pulse-panel";
import { useToast } from "@/components/ui/toast-provider";
import { PrismPremiumHero } from "@/components/prism/prism-premium-hero";
import { PrismCollapsible } from "@/components/prism/prism-collapsible";
import {
  HistoryRow,
  IntelRow,
  MacroChip,
  MiniStat,
  PrismSectionHead,
} from "@/components/prism/prism-parts";

type EventOption = {
  id: string;
  label: string;
  category: "macro" | "geopolitical" | "markets";
};

const INTEL_PREVIEW = 6;

type IntelFeedRow = {
  source: string;
  title: string;
  relevancePct?: number;
  cryptoRelevance?: number;
  impact?: string;
};

function eventScopeKey(eventId: string, customEvent: string) {
  return `${eventId}::${customEvent.trim().toLowerCase()}`;
}

export function PrismConsole() {
  const toast = useToast();
  const { isConnected } = useAccount();
  const { payArcFee, ensureArcNetwork, isPending: arcPending, feeUsd } = useBnbSettlement();
  const [lastArcFeeTx, setLastArcFeeTx] = useState<string | null>(null);
  const [feePaidDismissed, setFeePaidDismissed] = useState(false);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selected, setSelected] = useState<string>("fed-cut-june");
  const [customEvent, setCustomEvent] = useState("");
  const [predictions, setPredictions] = useState<PrismPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [enterId, setEnterId] = useState<string | null>(null);
  const [macroSnap, setMacroSnap] = useState<PrismMacroSnapshot | null>(null);
  const [intelScope, setIntelScope] = useState<string | null>(null);
  const [intelExpanded, setIntelExpanded] = useState(false);
  const [latestIntel, setLatestIntel] = useState<{
    gdelt: Array<{ title: string; source: string }>;
    news: Array<{ title: string; source: string }>;
    eventRegistry?: Array<{ title: string; source: string }>;
    community?: CommunityPulse;
    macro?: PrismMacroSnapshot;
    engine?: PrismEngineContext;
    scoredHeadlines?: ScoredHeadline[];
    intelStatus?: PrismIntelStatus;
  } | null>(null);
  const [latestEngine, setLatestEngine] = useState<PrismEngineContext | null>(null);

  const selectedLabel =
    customEvent.trim() ||
    events.find((e) => e.id === selected)?.label ||
    MACRO_EVENTS.find((e) => e.id === selected)?.label ||
    "Event";

  const selectedQuery =
    MACRO_EVENTS.find((e) => e.id === selected)?.query ?? selectedLabel;

  const scopedIntel = useMemo((): IntelFeedRow[] => {
    if (!latestIntel || intelScope !== eventScopeKey(selected, customEvent)) return [];
    if (latestIntel.scoredHeadlines && latestIntel.scoredHeadlines.length > 0) {
      return latestIntel.scoredHeadlines.map((h) => ({
        source: h.source,
        title: h.title,
        relevancePct: h.eventMatchPct,
        cryptoRelevance: h.cryptoRelevance,
        impact: h.impact,
      }));
    }
    return filterIntelForEvent(
      mergeIntelSources({
        gdelt: latestIntel.gdelt,
        news: latestIntel.news,
        eventRegistry: latestIntel.eventRegistry,
        community: latestIntel.community?.items,
      }),
      selectedLabel,
      selectedQuery,
      0.2,
    ).map((h) => ({
      source: h.source,
      title: h.title,
      relevancePct: h.relevancePct,
    }));
  }, [latestIntel, intelScope, selected, customEvent, selectedLabel, selectedQuery]);

  const intelStatus = latestIntel?.intelStatus;
  const intelRanForScope = intelScope === eventScopeKey(selected, customEvent);

  const loadMacro = useCallback(async (eventId: string) => {
    try {
      const res = await fetch(`/api/prism/macro?eventId=${encodeURIComponent(eventId)}`, {
        cache: "no-store",
      });
      if (res.ok) setMacroSnap(await res.json());
    } catch {
      setMacroSnap(null);
    }
  }, []);

  const load = useCallback(async () => {
    const [predRes, eventsRes] = await Promise.all([
      fetch("/api/prism/predictions"),
      fetch("/api/prism/events"),
    ]);
    setPredictions(await predRes.json());
    setEvents(await eventsRes.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadMacro(selected);
  }, [selected, loadMacro]);

  useEffect(() => {
    setLatestIntel(null);
    setLatestEngine(null);
    setIntelScope(null);
    setIntelExpanded(false);
  }, [selected, customEvent]);

  async function analyze() {
    if (!isConnected) {
      toast({
        type: "error",
        title: "Connect wallet",
        message: `Connect wallet to pay the $${PRISM_FORECAST_FEE_USD.toFixed(2)} forecast fee.`,
      });
      return;
    }
    setLoading(true);
    try {
      await ensureArcNetwork();
      const fee = await payArcFee(
        "PRISM_FORECAST",
        `prism-${selected}-${customEvent.trim() || "preset"}-${Date.now()}`,
      );
      setLastArcFeeTx(fee.txHash);
      setFeePaidDismissed(false);
      toast({
        type: "success",
        title: "Forecast fee paid",
        message: `$${PRISM_FORECAST_FEE_USD.toFixed(2)} USDC on Arc · ${truncateHash(fee.txHash, 6, 4)}`,
      });

      const res = await fetch("/api/prism/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selected,
          customEvent,
          arcFeeTxHash: fee.txHash,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Forecast failed");
      setLatestIntel(data.intelligence);
      setLatestEngine(data.intelligence?.engine ?? null);
      setIntelScope(eventScopeKey(selected, customEvent));
      setIntelExpanded(false);
      setPredictions((prev) => [data.prediction, ...prev]);
      setEnterId(data.prediction.id);
      toast({
        type: "success",
        title: "Forecast generated",
        message: `${data.prediction.probability}% · ${data.prediction.confidence}% confidence`,
      });
      requestAnimationFrame(() => {
        document.getElementById("prism-forecast")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      toast({
        type: "error",
        title: "Forecast failed",
        message: err instanceof Error ? err.message : "Try again",
      });
    } finally {
      setLoading(false);
    }
  }

  const latest = predictions[0];
  const intelVisible = scopedIntel.length > 0;
  const intelPreview = scopedIntel.slice(0, INTEL_PREVIEW);
  const intelMore = intelExpanded ? scopedIntel.slice(INTEL_PREVIEW) : [];

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden text-white" data-prism-page data-arc-theme="prism">
      <ArcBackground theme="prism" />
      <div className="relative z-10 mx-auto max-w-7xl px-3 py-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-8 sm:pb-12">
        <PrismPremiumHero
          loading={loading || arcPending}
          onAnalyze={analyze}
          feeUsd={feeUsd}
          walletConnected={isConnected}
        />
        {macroSnap?.market && (
          <div className="prism-macro-strip mb-4 sm:mb-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MacroChip label="BTC" price={macroSnap.market.btcPrice} change={macroSnap.market.btcChange24h} />
              <MacroChip label="ETH" price={macroSnap.market.ethPrice} change={macroSnap.market.ethChange24h} />
              {macroSnap.market.totalMarketCapUsd > 0 && (
                <MacroChip
                  label="Mkt cap"
                  price={macroSnap.market.totalMarketCapUsd}
                  change={macroSnap.market.marketCapChange24h}
                  compact
                />
              )}
              {macroSnap.defi && (
                <MacroChip
                  label="DeFi TVL"
                  price={macroSnap.defi.totalTvlUsd}
                  change={macroSnap.defi.change7dPct ?? 0}
                  compact
                />
              )}
            </div>
            {macroSnap.fred && (
              <p className="mt-2 rounded-lg border border-amber-400/20 bg-amber-500/8 px-3 py-2 text-center text-[11px] text-amber-100/90">
                FRED · {macroSnap.fred.label}: {macroSnap.fred.latest.value}
                {macroSnap.fred.changePct != null
                  ? ` (${macroSnap.fred.changePct >= 0 ? "+" : ""}${macroSnap.fred.changePct.toFixed(2)}%)`
                  : ""}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-5 max-lg:gap-4 lg:grid-cols-2 lg:gap-6 lg:items-start">
          {/* Left: choose event + history */}
          <div className="flex min-w-0 flex-col gap-4 max-lg:gap-3">
            <Card className="arc-glass-card-prism prism-section-card overflow-hidden">
              <CardHeader className="shrink-0 border-b border-white/10 pb-2">
                <PrismSectionHead icon={Target} title="Choose event" />
              </CardHeader>
              <CardContent className="prism-scroll-panel max-h-[42vh] space-y-2 overflow-y-auto overflow-x-hidden max-lg:max-h-none max-lg:overflow-visible lg:max-h-[38vh]">
                {events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelected(event.id)}
                    className={cn(
                      "arc-glass-interactive w-full min-h-[52px] rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99]",
                      selected === event.id
                        ? "border-amber-400/45 bg-amber-500/15 shadow-[0_0_20px_-8px_rgba(251,146,60,0.35)]"
                        : "border-white/10 bg-white/[0.03]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium leading-snug text-white">{event.label}</span>
                      <Badge variant="prism" className="shrink-0 !text-[9px]">
                        {event.category}
                      </Badge>
                    </div>
                  </button>
                ))}
                <textarea
                  value={customEvent}
                  onChange={(e) => setCustomEvent(e.target.value)}
                  placeholder="Or type your own event…"
                  className="arc-input-glass min-h-[72px] w-full resize-none px-3 py-2.5 text-sm text-white placeholder:text-white/35"
                />
              </CardContent>
            </Card>

            <PrismCollapsible
              label="History"
              hint={`${predictions.length} forecast${predictions.length === 1 ? "" : "s"}`}
              icon={History}
              defaultOpen
              bodyClassName="prism-scroll-panel max-h-[40vh] overflow-y-auto overflow-x-hidden max-lg:max-h-none max-lg:overflow-visible"
            >
              {predictions.length === 0 ? (
                <p className="text-sm text-white/55">No forecasts yet — generate one above.</p>
              ) : (
                <div className="space-y-2.5">
                  {predictions.map((prediction) => (
                    <HistoryRow
                      key={prediction.id}
                      prediction={prediction}
                      animateIn={prediction.id === enterId}
                    />
                  ))}
                </div>
              )}
            </PrismCollapsible>
          </div>

          {/* Right: forecast + intel (replaces old history column) */}
          <div id="prism-forecast" className="flex min-w-0 scroll-mt-28 flex-col gap-4 max-lg:gap-3">
            <Card className="arc-glass-card-prism prism-forecast-card overflow-hidden">
              <CardContent className="overflow-hidden p-0">
                <div className="overflow-hidden bg-gradient-to-br from-amber-500/18 via-violet-600/10 to-transparent p-4 sm:p-7">
                  <p className="text-xs font-medium uppercase tracking-widest text-amber-200/80">Probability</p>
                  <div className="mt-2 flex items-end gap-2">
                    <p className="text-4xl font-bold leading-none tabular-nums sm:text-5xl lg:text-6xl">
                      {latest?.probability ?? "—"}
                    </p>
                    {latest && <p className="pb-2 text-lg text-white/50">%</p>}
                  </div>
                  <p className="mt-3 break-words text-sm leading-relaxed text-white/85 sm:text-base">
                    {latest?.event ?? "Select an event, then tap Generate Forecast."}
                  </p>
                  {latestEngine && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="prism" className="text-[10px] uppercase tracking-wide">
                        {latestEngine.regime.replace(/-/g, " ")}
                      </Badge>
                      <span className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-white/60">
                        Signal agreement {Math.round(latestEngine.signalAgreement * 100)}%
                      </span>
                    </div>
                  )}
                  {latest && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <MiniStat label="Confidence" value={`${latest.confidence}%`} />
                      <MiniStat label="Kelly" value={`${(latest.kellyFraction * 100).toFixed(1)}%`} />
                      <MiniStat label="Horizon" value={latest.horizon} />
                    </div>
                  )}
                </div>
                {latest && (
                  <div className="space-y-3 overflow-hidden border-t border-white/10 p-4 sm:p-6">
                    <p className="nexus-lead break-words text-sm leading-relaxed sm:text-base">{latest.summary}</p>
                    {latestEngine && latestEngine.transmissionChain.length > 0 && (
                      <p className="break-words text-xs leading-relaxed text-amber-200/80">
                        Transmission: {latestEngine.transmissionChain.join(" → ")}
                      </p>
                    )}
                    {latestEngine?.invalidation && (
                      <p className="break-words text-xs text-white/55">
                        <span className="font-semibold text-amber-200/90">Invalidation: </span>
                        {latestEngine.invalidation}
                      </p>
                    )}
                    {latestEngine?.memoryNote && (
                      <p className="break-words text-xs text-violet-200/75">{latestEngine.memoryNote}</p>
                    )}
                    {latestEngine && Object.keys(latestEngine.weights).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(latestEngine.weights)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([k, w]) => (
                            <span
                              key={k}
                              className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/65"
                            >
                              {k} {Math.round(w * 100)}%
                            </span>
                          ))}
                      </div>
                    )}
                    <PrismCollapsible
                      key={latest.id}
                      label="Agent reasoning"
                      hint="Verified sources · macro cross-check · probability thesis"
                      icon={Brain}
                      defaultOpen={false}
                      className="border-amber-400/15"
                      bodyClassName="max-h-[min(52vh,420px)] overflow-y-auto max-lg:max-h-none max-lg:overflow-visible"
                    >
                      <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-white/80">
                        {latest.reasoning}
                      </pre>
                      {latestEngine?.scoredHeadlines && latestEngine.scoredHeadlines.length > 0 && (
                        <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-3">
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
                            Top verified headlines
                          </p>
                          <ul className="space-y-1.5">
                            {latestEngine.scoredHeadlines.slice(0, 6).map((h, i) => (
                              <li key={`${h.source}-${i}`} className="text-xs text-white/75">
                                <span className="text-amber-200/90">{h.impact}</span>
                                {" · "}
                                {h.cryptoRelevance}% relevance · {h.eventMatchPct}% match ·{" "}
                                {h.title.slice(0, 120)}
                                {h.title.length > 120 ? "…" : ""}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </PrismCollapsible>
                    {latest.arcTxHash && (
                      <p className="text-xs text-white/45">Arc · {truncateHash(latest.arcTxHash, 10, 8)}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {lastArcFeeTx && !feePaidDismissed && (
              <div className="relative rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5 pr-9 text-center text-[11px] leading-relaxed text-emerald-100/90 sm:text-xs">
                <button
                  type="button"
                  onClick={() => setFeePaidDismissed(true)}
                  aria-label="Dismiss"
                  className="absolute right-2 top-2 rounded-md p-0.5 text-emerald-200/70 transition hover:bg-emerald-500/20 hover:text-emerald-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                Fee paid on Arc ·{" "}
                <a
                  href={arcExplorerTx(lastArcFeeTx)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline underline-offset-2"
                >
                  tx {truncateHash(lastArcFeeTx, 8, 6)}
                </a>
              </div>
            )}

            <PrismCollapsible
              label="Intel feed"
              hint={
                intelVisible
                  ? `${scopedIntel.length} headlines for “${selectedLabel.slice(0, 42)}${selectedLabel.length > 42 ? "…" : ""}”`
                  : "Run Generate Forecast for event-matched news"
              }
              icon={Radar}
              defaultOpen={intelVisible}
              bodyClassName="overflow-hidden max-lg:overflow-visible"
            >
              {!intelVisible ? (
                <div className="space-y-2 py-3 text-center text-sm leading-relaxed text-white/55">
                  {intelRanForScope && intelStatus?.message ? (
                    <p>{intelStatus.message}</p>
                  ) : (
                    <p>
                      Headlines appear here after <strong className="text-amber-200">Generate Forecast</strong>, filtered
                      to your selected event only.
                    </p>
                  )}
                  {intelRanForScope && intelStatus && (
                    <p className="text-[11px] text-white/40">
                      Raw feeds: {intelStatus.totalRaw} · Matched: {intelStatus.feedCount}
                      {intelStatus.openNewsQuotaExhausted ? " · 6551 quota limited" : ""}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 overflow-hidden">
                  {intelStatus?.usingFallback && intelStatus.message && (
                    <p className="rounded-lg border border-amber-400/20 bg-amber-500/8 px-3 py-2 text-[11px] leading-relaxed text-amber-100/85">
                      {intelStatus.message}
                    </p>
                  )}
                  {intelPreview.map((item, index) => (
                    <IntelRow
                      key={`${item.source}-${index}`}
                      source={item.source}
                      title={item.title}
                      relevancePct={item.relevancePct}
                      cryptoRelevance={item.cryptoRelevance}
                      impact={item.impact}
                    />
                  ))}
                  {intelExpanded &&
                    intelMore.map((item, index) => (
                      <IntelRow
                        key={`more-${item.source}-${index}`}
                        source={item.source}
                        title={item.title}
                        relevancePct={item.relevancePct}
                        cryptoRelevance={item.cryptoRelevance}
                        impact={item.impact}
                      />
                    ))}
                  {scopedIntel.length > INTEL_PREVIEW && (
                    <button
                      type="button"
                      onClick={() => setIntelExpanded((v) => !v)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/25 bg-amber-500/10 py-2 text-[11px] font-semibold uppercase tracking-wider text-amber-100/90 transition hover:bg-amber-500/18"
                    >
                      {intelExpanded
                        ? "Show fewer"
                        : `Show ${scopedIntel.length - INTEL_PREVIEW} more`}
                    </button>
                  )}
                  {intelExpanded &&
                    latestIntel?.community &&
                    latestIntel.community.items.length > 0 && (
                      <div className="mt-2 border-t border-white/10 pt-2">
                        <CommunityPulsePanel pulse={latestIntel.community} title="Community pulse" compact />
                      </div>
                    )}
                </div>
              )}
            </PrismCollapsible>
          </div>
        </div>
      </div>
    </div>
  );
}
