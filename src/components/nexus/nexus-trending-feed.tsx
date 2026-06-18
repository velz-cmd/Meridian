"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  ChevronDown,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Waves,
} from "lucide-react";
import { NexusTokenChatButton } from "@/components/nexus/nexus-token-chat";
import { NexusTokenAvatar } from "@/components/nexus/nexus-token-avatar";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCompact, formatPct, formatTokenPrice } from "@/lib/utils";
import { dedupeFeedTokens } from "@/lib/feed-curation";
import { mergeFeedTokensStable } from "@/lib/token-security";
import { filterTradableTokens, isStablecoin } from "@/lib/token-filters";
import { STABLE_FEED_LIMIT } from "@/lib/feed-config";
import { agentVerdictLine } from "@/lib/nexus-copy";
import { filterReasoningFactorsForDisplay } from "@/lib/reasoning-factors";
import { cn } from "@/lib/utils";
import type { TokenIntel } from "@/lib/storage";
import type { AgentSignal } from "@/lib/storage";
import type { TokenSecurityReport } from "@/lib/token-security";

export type TrendingMarketToken = {
  symbol: string;
  name: string;
  tokenAddress: string;
  chainId: string;
  pairAddress: string;
  priceUsd: number;
  change24h: number;
  volume24h: number;
  liquidityUsd: number;
  marketCap?: number;
  fdv?: number;
  icon?: string;
  url: string;
  intel?: TokenIntel;
  demoTradeable?: boolean;
  suggestedNetwork?: string;
  txns24h?: { buys: number; sells: number };
  agent?: AgentSignal;
  security?: TokenSecurityReport;
  updatedAt?: string;
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  discoveryTag?: string;
  sourceTags?: string[];
};

const REFRESH_MS = 45_000;
const MAX_FEED = STABLE_FEED_LIMIT;
const FEED_PREVIEW = 8;
const QUICK_TIMEOUT_MS = 42_000;
const FULL_TIMEOUT_MS = 40_000;
const FEED_SESSION_KEY = "nexus-feed-v9";
const FEED_SESSION_TTL_MS = 90_000;

function isFeedExcluded(t: TrendingMarketToken): boolean {
  return isStablecoin(t.symbol, t.name, {
    tokenAddress: t.tokenAddress,
    chainId: t.chainId,
    priceUsd: t.priceUsd,
    change24h: t.change24h,
  });
}

type FeedSessionCache = {
  at: number;
  tokens: TrendingMarketToken[];
  updatedAt?: string;
  counts?: { buy: number; sell: number; hold: number };
  feedCycle?: number;
};

function readFeedSession(): FeedSessionCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(FEED_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FeedSessionCache;
    if (!parsed?.tokens?.length || Date.now() - parsed.at > FEED_SESSION_TTL_MS) return null;
    parsed.tokens = dedupeFeedTokens(filterTradableTokens(parsed.tokens));
    if (!parsed.tokens.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeFeedSession(data: FeedSessionCache) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(FEED_SESSION_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

function FeedSkeletonRows({ count = FEED_PREVIEW }: { count?: number }) {
  return (
    <div className="space-y-1.5" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="nexus-feed-row animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3"
        >
          <div className="flex items-start gap-2">
            <div className="h-10 w-10 shrink-0 rounded-full bg-white/10" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-24 rounded bg-white/10" />
              <div className="h-2.5 w-32 rounded bg-white/[0.06]" />
            </div>
            <div className="space-y-2 text-right">
              <div className="ml-auto h-3.5 w-16 rounded bg-white/10" />
              <div className="ml-auto h-2.5 w-12 rounded bg-white/[0.06]" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((__, j) => (
              <div key={j} className="h-2.5 rounded bg-white/[0.05]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function chainLabel(chainId: string): string {
  const id = chainId.toLowerCase();
  if (id === "base") return "Base";
  if (id === "arbitrum") return "ARB";
  if (id === "ethereum") return "ETH";
  if (id === "solana") return "SOL";
  return chainId.slice(0, 4).toUpperCase();
}

export function NexusTrendingFeed({
  selectedAddress,
  onSelect,
  onTokensRefresh,
  onOpenTrade,
  showAgent = true,
  compactDesktop = false,
  cleanFeed = false,
  className,
}: {
  selectedAddress?: string;
  onSelect: (token: TrendingMarketToken, options?: { openChart?: boolean }) => void;
  onTokensRefresh?: (tokens: TrendingMarketToken[]) => void;
  onOpenTrade?: (tab: "buy" | "sell" | "agent") => void;
  showAgent?: boolean;
  /** Narrow left column: denser rows, less vertical scroll */
  compactDesktop?: boolean;
  /** Hide long agent paragraphs — cleaner live feed */
  cleanFeed?: boolean;
  className?: string;
}) {
  const sessionSeed = readFeedSession();
  const [tokens, setTokens] = useState<TrendingMarketToken[]>(() => sessionSeed?.tokens ?? []);
  const [loading, setLoading] = useState(() => !(sessionSeed?.tokens?.length));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(() => sessionSeed?.updatedAt ?? null);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_MS / 1000);
  const [counts, setCounts] = useState(() => sessionSeed?.counts ?? { buy: 0, sell: 0, hold: 0 });
  const [feedCycle, setFeedCycle] = useState(() => sessionSeed?.feedCycle ?? 0);
  const [feedExpanded, setFeedExpanded] = useState(false);

  const onSelectRef = useRef(onSelect);
  const onRefreshRef = useRef(onTokensRefresh);
  const selectedAddressRef = useRef(selectedAddress);
  const didInitialPick = useRef(false);
  const userPickedRef = useRef(false);
  const loadInFlightRef = useRef(false);
  const hasTokensRef = useRef(tokens.length > 0);

  useEffect(() => {
    hasTokensRef.current = tokens.length > 0;
  }, [tokens.length]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    onRefreshRef.current = onTokensRefresh;
  }, [onTokensRefresh]);
  useEffect(() => {
    selectedAddressRef.current = selectedAddress;
  }, [selectedAddress]);

  const applyFeed = useCallback((list: TrendingMarketToken[], data: { feedCycle?: number; updatedAt?: string; counts?: typeof counts }) => {
    const tradable = dedupeFeedTokens(filterTradableTokens(list));
    setFeedCycle(data.feedCycle ?? 0);
    setUpdatedAt(data.updatedAt ?? new Date().toISOString());
    setCounts(data.counts ?? { buy: 0, sell: 0, hold: 0 });
    setSecondsLeft(REFRESH_MS / 1000);
    setError(null);
    setTokens((prev) => {
      const merged = mergeFeedTokensStable(prev, tradable, MAX_FEED, isFeedExcluded);
      onRefreshRef.current?.(merged);
      writeFeedSession({
        at: Date.now(),
        tokens: merged,
        updatedAt: data.updatedAt ?? new Date().toISOString(),
        counts: data.counts ?? { buy: 0, sell: 0, hold: 0 },
        feedCycle: data.feedCycle ?? 0,
      });
      return merged;
    });
    if (!userPickedRef.current && !didInitialPick.current && tradable[0]) {
      didInitialPick.current = true;
      onSelectRef.current(tradable[0], { openChart: false });
    }
  }, []);

  const fetchFeed = useCallback(async (quick: boolean, timeoutMs: number, bustCache = false) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const q = quick ? "&quick=1" : "";
    const lim = STABLE_FEED_LIMIT;
    const bust = bustCache ? `&t=${Date.now()}` : "";
    try {
      const res = await fetch(`/api/nexus/feed?limit=${lim}${q}${bust}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load feed");
      return { list: (data.tokens ?? []) as TrendingMarketToken[], data };
    } finally {
      clearTimeout(timer);
    }
  }, []);

  const fetchWithRetry = useCallback(
    async (quick: boolean, timeoutMs: number, bustCache = false) => {
      try {
        return await fetchFeed(quick, timeoutMs, bustCache);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return fetchFeed(quick, Math.round(timeoutMs * 1.5), bustCache);
        }
        throw err;
      }
    },
    [fetchFeed],
  );

  const load = useCallback(
    async (silent = false, manual = false) => {
      if (loadInFlightRef.current && !manual) return;
      loadInFlightRef.current = true;
      const hasTokens = hasTokensRef.current;
      if (!silent && !hasTokens) setLoading(true);
      else setRefreshing(true);
      try {
        const { list, data } = await fetchWithRetry(true, QUICK_TIMEOUT_MS, manual);
        applyFeed(list, data);
        if (!silent || manual) {
          void (async () => {
            try {
              const full = await fetchWithRetry(false, FULL_TIMEOUT_MS, manual);
              applyFeed(full.list, full.data);
            } catch {
              /* keep quick feed */
            }
          })();
        }
      } catch (err) {
        const cached = readFeedSession();
        const msg =
          err instanceof Error && err.name === "AbortError"
            ? cached?.tokens?.length
              ? "Refresh slow — showing your last loaded feed. Tap Retry."
              : "Feed timed out — tap Retry (cold start or APIs busy)"
            : err instanceof Error
              ? err.message
              : "Feed load failed";
        if (cached?.tokens?.length) {
          setTokens(filterTradableTokens(cached.tokens));
          setUpdatedAt(cached.updatedAt ?? null);
          setCounts(cached.counts ?? { buy: 0, sell: 0, hold: 0 });
          setFeedCycle(cached.feedCycle ?? 0);
          setError(msg);
        } else if (!hasTokens) {
          setError(msg);
        }
      } finally {
        loadInFlightRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyFeed, fetchWithRetry],
  );

  useEffect(() => {
    load();
    const refreshInterval = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(refreshInterval);
  }, [load]);

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? REFRESH_MS / 1000 : s - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  function handleUserSelect(token: TrendingMarketToken) {
    userPickedRef.current = true;
    onSelect(token, { openChart: true });
  }

  const hiddenCount = Math.max(0, tokens.length - FEED_PREVIEW);
  const showFeedToggle = hiddenCount > 0;
  const visibleTokens = feedExpanded ? tokens : tokens.slice(0, FEED_PREVIEW);

  function renderTokenRow(token: TrendingMarketToken) {
    const selected = selectedAddress?.toLowerCase() === token.tokenAddress.toLowerCase();
    const agent = token.agent;
    const sec = token.security;

    return (
      <motion.button
        key={`${token.chainId}:${token.tokenAddress}`}
        type="button"
        onClick={() => handleUserSelect(token)}
        className={cn(
          "nexus-feed-row w-full rounded-2xl border text-left transition-all duration-200 active:scale-[0.99] max-lg:min-h-[72px]",
          compactDesktop ? "p-2 lg:rounded-xl" : "p-3",
          selected
            ? "arc-glass-card arc-glass-card-nexus arc-glass-interactive arc-border-trace border-cyan-400/40 shadow-[0_0_24px_-6px_var(--nexus-glow)]"
            : "arc-glass-card arc-glass-interactive arc-border-trace border-[var(--arc-border)] hover:border-cyan-400/35 hover:shadow-[0_0_20px_-8px_var(--nexus-glow)]",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <NexusTokenAvatar
              symbol={token.symbol}
              icon={token.icon}
              size={compactDesktop ? "sm" : "md"}
              className={compactDesktop ? "lg:!h-8 lg:!w-8" : "max-lg:!h-12 max-lg:!w-12"}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1">
                <span
                  className={cn(
                    "font-semibold",
                    compactDesktop ? "text-sm lg:text-[13px]" : "text-base max-lg:text-[15px]",
                  )}
                >
                  {token.symbol}
                </span>
                <span className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/50">
                  {chainLabel(token.chainId)}
                </span>
                {token.discoveryTag && (
                  <span
                    className={cn(
                      "rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                      /honeypot|rug risk|pump-dump/i.test(token.discoveryTag)
                        ? "border-rose-400/35 bg-rose-500/15 text-rose-100"
                        : "border-cyan-400/25 bg-cyan-500/10 text-cyan-100/90",
                    )}
                  >
                    {token.discoveryTag}
                  </span>
                )}
                <NexusTokenChatButton
                  token={token}
                  onOpenTrade={onOpenTrade}
                  className="!min-h-[32px] shrink-0 !px-2 !py-1 !text-[10px] max-lg:!text-[9px]"
                />
                {agent && (
                  <Badge
                    variant={
                      agent.deskVerdict === "AVOID" || agent.deskVerdict === "EXIT"
                        ? "sell"
                        : agent.action === "BUY"
                          ? "buy"
                          : agent.action === "SELL"
                            ? "sell"
                            : "hold"
                    }
                  >
                    {agent.deskVerdict ?? agent.action}
                  </Badge>
                )}
                {sec && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                      sec.honeypotRisk || sec.scamRisk
                        ? "bg-rose-500/20 text-rose-200"
                        : sec.grade === "A" || sec.grade === "B"
                          ? "bg-emerald-500/15 text-emerald-200"
                          : "bg-amber-500/15 text-amber-200"
                    }`}
                  >
                    {sec.honeypotRisk || sec.scamRisk ? (
                      <ShieldAlert className="h-3 w-3" />
                    ) : sec.grade === "A" || sec.grade === "B" ? (
                      <ShieldCheck className="h-3 w-3" />
                    ) : (
                      <Shield className="h-3 w-3" />
                    )}
                    {sec.grade} · {sec.score}
                  </span>
                )}
              </div>
              {!compactDesktop && <p className="text-xs text-white/45">{token.name}</p>}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className={cn("font-medium tabular-nums", compactDesktop && "text-xs")}>
              {formatTokenPrice(token.priceUsd)}
            </p>
            <p
              className={`flex items-center justify-end gap-1 text-xs ${token.change24h >= 0 ? "text-emerald-300" : "text-rose-300"}`}
            >
              {token.change24h >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {formatPct(token.change24h)}
            </p>
          </div>
        </div>

        {(sec?.honeypotRisk || sec?.scamRisk) && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-200">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {sec.scamLabel ?? sec.label}
          </div>
        )}

        {agent && (
          <div className="mt-1.5 space-y-0.5">
            <p className="flex items-center gap-1.5 text-[11px] text-white/55">
              <Bot className="h-3 w-3 shrink-0 text-cyan-300/80" />
              <span className="font-semibold text-cyan-200/95">
                {agent.confidence}% {agent.deskVerdict ?? agent.action}
              </span>
              {token.intel?.technical && cleanFeed && (
                <span className="text-[10px] text-violet-200/60">
                  · RSI {token.intel.technical.rsi.toFixed(0)}
                </span>
              )}
            </p>
            {(agent.whyAction || agent.reasoning) && (
              <p className="line-clamp-2 text-[10px] leading-snug text-white/50">
                {agentVerdictLine(agent.whyAction, undefined, agent.reasoning)}
              </p>
            )}
            {cleanFeed && agent.reasoningFactors && agent.reasoningFactors.length > 0 && (
              <p className="line-clamp-1 text-[9px] text-white/40">
                {filterReasoningFactorsForDisplay(agent.reasoningFactors, 3)
                  .slice(0, 2)
                  .map((f) => f.label)
                  .join(" · ")}
              </p>
            )}
          </div>
        )}
        {token.intel?.technical && !cleanFeed && !compactDesktop && (
          <p className="mt-1 text-[10px] text-violet-200/60">
            RSI {token.intel.technical.rsi.toFixed(0)} · {token.intel.technical.trend.replace("_", " ")} ·{" "}
            {token.intel.technical.score}/100
          </p>
        )}

        <div
          className={cn(
            "mt-2 gap-2 text-[11px] max-lg:text-xs",
            compactDesktop
              ? "flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] lg:mt-1 lg:text-[9px]"
              : "grid grid-cols-2 lg:grid-cols-4 lg:gap-1 lg:text-[10px]",
          )}
        >
          <span className="flex items-center gap-1 text-white/55">
            <Waves className="h-3 w-3 text-cyan-300/70" />
            Vol {formatCompact(token.volume24h)}
          </span>
          <span className="flex items-center gap-1 text-white/55">
            <BarChart3 className="h-3 w-3 text-violet-300/70" />
            Liq {formatCompact(token.liquidityUsd)}
          </span>
          <span className="flex items-center gap-1 font-medium text-cyan-300/90">
            <TrendingUp className="h-3 w-3" />
            Buys {token.txns24h?.buys ?? "—"}
          </span>
          <span className="flex items-center gap-1 font-medium text-rose-300">
            <TrendingDown className="h-3 w-3" />
            Sells {token.txns24h?.sells ?? "—"}
          </span>
        </div>
      </motion.button>
    );
  }

  if (loading && tokens.length === 0) {
    return (
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex items-center gap-2 text-white/50">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
          <span className="text-sm">Loading market tokens…</span>
        </div>
        <FeedSkeletonRows count={FEED_PREVIEW} />
      </div>
    );
  }

  if (error && tokens.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-6 text-sm text-rose-200">
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={() => load(false, true)}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Retry feed
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ArcIcon3d icon={BarChart3} theme="nexus" size="sm" />
          <h3 className="arc-caption text-white/80 sm:text-sm">
            <span className="lg:hidden">{tokens.length} tokens · {secondsLeft}s</span>
            <span className="hidden lg:inline">
              {tokens.length} movers (max {MAX_FEED}) · refresh in {secondsLeft}s
            </span>
          </h3>
          {refreshing && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {showAgent && (
            <>
              <Badge variant="buy" className="!text-[9px]">{counts.buy} B</Badge>
              <Badge variant="sell" className="!text-[9px]">{counts.sell} S</Badge>
              <Badge variant="hold" className="!text-[9px]">{counts.hold} H</Badge>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => load(false, true)} disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <p className="text-xs text-white/55 lg:hidden">
        Tap any token to open its chart. Bottom tabs: Tokens · Chart · Trade.
        {refreshing && <span className="ml-1 text-cyan-300"> Updating…</span>}
      </p>

      <div
        className={cn(
          "nexus-feed-scroll min-h-0 flex-1 space-y-1.5 pr-1",
          compactDesktop || feedExpanded
            ? "overflow-y-auto overscroll-contain pb-2 max-lg:overflow-visible max-lg:flex-none"
            : "overflow-hidden pb-1 max-lg:overflow-visible max-lg:flex-none",
        )}
      >
        {visibleTokens.map((token) => renderTokenRow(token))}
      </div>

      {showFeedToggle && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-[44px] w-full gap-2 border-white/15 bg-white/[0.03] text-sm text-white/80 hover:bg-white/[0.06]"
          onClick={() => setFeedExpanded((prev) => !prev)}
        >
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 transition-transform duration-200", feedExpanded && "rotate-180")}
          />
          {feedExpanded ? "Show less" : `Show ${hiddenCount} more`}
        </Button>
      )}
    </div>
  );
}
