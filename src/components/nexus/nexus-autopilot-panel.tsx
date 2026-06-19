"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { useAgentWallet } from "@/hooks/use-agent-wallet";
import {
  AutopilotAmountMode,
  AUTOPILOT_INTERVALS,
  autopilotIntervalMs,
  autopilotOnceDelayMs,
  autopilotScheduleSummary,
  clampFuturesLeverage,
  effectiveMaxTrades,
  estimateRequiredUsdc,
  minVaultUsdcForAutopilot,
  onceScheduleLabel,
  loadAutopilot,
  saveAutopilot,
  tokenKey,
  type AutopilotConfig,
  type AutopilotHoldAction,
  type AutopilotInterval,
  type AutopilotLog,
  type AutopilotVenue,
} from "@/lib/nexus-autopilot";
import type { AutopilotDeskCycle } from "@/lib/autopilot-desk-engine";
import { AutopilotDeskPreview } from "@/components/nexus/autopilot-desk-preview";
import {
  autopilotSessionExpiryMs,
  buildSessionPayload,
  clearAutopilotSession,
  isAutopilotSessionValid,
  loadAutopilotSession,
  saveAutopilotSession,
  sessionIntervalLabel,
  type AutopilotSessionGrant,
} from "@/lib/nexus-autopilot-session";
import { readApiJson } from "@/lib/fetch-json";
import { nexusGlassCta } from "@/lib/nexus-action-glass";
import {
  Activity,
  BarChart3,
  Bot,
  Calendar,
  Clock,
  Coins,
  DollarSign,
  Loader2,
  Percent,
  Play,
  Shield,
  Timer,
  TrendingDown,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { useBnbSettlement } from "@/hooks/use-bnb-settlement";
import { useBnbSpotUsd } from "@/hooks/use-bnb-spot-usd";
import { usePancakeSwap } from "@/hooks/use-pancake-swap";
import { BSC_CHAIN_ID, BSC_CHAIN_LABEL } from "@/lib/bsc-chain";
import { canSwapOnBscTestnet, fetchDeskTokenBalance, BSC_TESTNET_CATALOG } from "@/lib/testnet-onchain";
import { appendMeridianActivity } from "@/lib/meridian-activity-log";
import { pulseAdjustAgentAction, type MarketPulse } from "@/lib/market-pulse";
import type { PositionRoute } from "@/lib/position-router";
import { useConstitution } from "@/contexts/nexus-constitution-context";
import { NexusAgentProvider, type NexusAgentRuntime } from "@/components/nexus/nexus-agent-context";
import { NexusExecutionPanel } from "@/components/nexus/nexus-execution-panel";
import { NexusTokenSearchPicker } from "@/components/nexus/nexus-token-search-picker";
import type { GateExecutionIntent } from "@/lib/gate-execution-intent";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

const PCT_OPTIONS = [25, 50, 75, 100] as const;
const MARGIN_PCT_OPTIONS = [10, 25, 50, 75] as const;
const MAX_TRADE_PRESETS = [
  { value: 0, label: "∞" },
  { value: 1, label: "1" },
  { value: 3, label: "3" },
  { value: 5, label: "5" },
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: -1, label: "Custom" },
] as const;
const INTERVAL_KEYS = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
  "12h",
  "1d",
  "1w",
  "custom",
] as const;

const defaultRuntime: NexusAgentRuntime = {
  enabled: false,
  nextIn: 0,
  running: false,
  logs: [],
  lastReasoning: null,
  displaySymbol: "—",
  stop: () => {},
  runNow: () => {},
};

export function NexusAutopilotPanel({
  token,
  analysisToken,
  catalogTokens = [],
  onTradeComplete,
  embedded = false,
  onAgentLiveChange,
  gateAutoStart = false,
  gateIntent = null,
}: {
  /** Chapel swap token (chain 97) — used for wallet execution */
  token: TrendingMarketToken | null;
  /** Feed/gate row for desk API (FLOKI thesis while swapping CAKE) */
  analysisToken?: TrendingMarketToken | null;
  /** Live feed tokens for unified name/CA search */
  catalogTokens?: TrendingMarketToken[];
  onTradeComplete?: () => void;
  embedded?: boolean;
  /** Only reports enabled state — avoids re-rendering Buy/Sell every second */
  onAgentLiveChange?: (live: boolean) => void;
  gateAutoStart?: boolean;
  gateIntent?: GateExecutionIntent | null;
}) {
  const toast = useToast();
  const { canExecuteBuy } = useConstitution();
  const { address, isConnected } = useAccount();
  const { data: walletBalance } = useBalance({ address, chainId: BSC_CHAIN_ID });
  const walletTbnb = walletBalance ? Number(walletBalance.formatted) : 0;
  const bnbSpotUsd = useBnbSpotUsd();
  const { swapNativeForToken, swapTokenForNative, swapTokenForToken, isPending: swapPending } = usePancakeSwap();
  const { usdcBalance: agentUsdc, refreshBalance, syncDeposits } = useAgentWallet();
  const { payArcFee, ensureBscNetwork, isPending: arcPending, feeUsd } = useBnbSettlement();
  const [config, setConfig] = useState<AutopilotConfig>(() => loadAutopilot());
  const [logs, setLogs] = useState<AutopilotLog[]>([]);
  const [lastReasoning, setLastReasoning] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [nextIn, setNextIn] = useState(0);
  const [resolvedToken, setResolvedToken] = useState<TrendingMarketToken | null>(null);
  const recurringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);
  const startIntentRef = useRef<"recurring" | "once">("recurring");
  const onceRunningRef = useRef(false);
  const configRef = useRef(config);
  const tokenRef = useRef(token);
  const analysisTokenRef = useRef(analysisToken);
  const resolvedRef = useRef(resolvedToken);
  const runCycleRef = useRef<(trigger?: "recurring" | "once") => Promise<void>>(async () => {});
  const agentUsdcRef = useRef(agentUsdc);
  const walletTbnbRef = useRef(walletTbnb);
  const sessionRef = useRef<AutopilotSessionGrant | null>(null);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [permissionIntent, setPermissionIntent] = useState<"recurring" | "once">("recurring");
  const [granting, setGranting] = useState(false);
  const gateAutoAppliedRef = useRef(false);
  const tradesExecutedRef = useRef(0);
  const [tradesExecuted, setTradesExecuted] = useState(0);
  const [awaitingWallet, setAwaitingWallet] = useState(false);
  const [agentRuntime, setAgentRuntime] = useState<NexusAgentRuntime>(defaultRuntime);

  const getValidSessionHash = useCallback((): string | null => {
    const s = sessionRef.current ?? loadAutopilotSession();
    if (!isAutopilotSessionValid(s, address)) return null;
    sessionRef.current = s;
    return s.arcFeeTxHash;
  }, [address]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);
  useEffect(() => {
    analysisTokenRef.current = analysisToken ?? token;
  }, [analysisToken, token]);
  useEffect(() => {
    resolvedRef.current = resolvedToken;
  }, [resolvedToken]);
  useEffect(() => {
    agentUsdcRef.current = agentUsdc;
  }, [agentUsdc]);
  useEffect(() => {
    walletTbnbRef.current = walletTbnb;
  }, [walletTbnb]);
  useEffect(() => {
    sessionRef.current = loadAutopilotSession();
  }, [address]);

  const walletUsd = walletTbnb * bnbSpotUsd;
  const requiredUsdc = minVaultUsdcForAutopilot(config, walletUsd, bnbSpotUsd);
  const hasDeposit =
    config.mode === "sell_only" || config.venue === "futures" || walletUsd >= requiredUsdc;

  const persist = useCallback((next: AutopilotConfig) => {
    configRef.current = next;
    setConfig(next);
    saveAutopilot(next);
  }, []);

  useEffect(() => {
    if (!gateAutoStart || gateAutoAppliedRef.current) return;
    gateAutoAppliedRef.current = true;
    const lev = gateIntent?.leverage ?? 2;
    const pct = Math.min(75, Math.max(20, lev * 15));
    persist({
      ...configRef.current,
      mode: "data_desk",
      venue: "spot",
      percent: pct,
      scheduleMode: "recurring",
      interval: "15m",
      holdAction: "skip",
    });
    setPermissionIntent("recurring");
    setPermissionOpen(true);
    toast({
      title: "Gate autopilot",
      message: `Follow ${gateIntent?.direction ?? "gate"} direction · ${lev}x thesis · authorize session to run.`,
      type: "info",
    });
  }, [gateAutoStart, gateIntent, persist, toast]);

  const pushLog = useCallback((message: string, type: AutopilotLog["type"] = "info") => {
    setLogs((prev) => [{ at: new Date().toISOString(), message, type }, ...prev].slice(0, 20));
  }, []);

  const activeToken = useCallback(() => {
    if (config.amountMode === "custom_token" && config.customTokenAddress.trim()) {
      return resolvedRef.current;
    }
    return tokenRef.current;
  }, [config.amountMode, config.customTokenAddress]);

  useEffect(() => {
    const ca = config.customTokenAddress.trim();
    if (config.amountMode !== "custom_token" || !ca) {
      setResolvedToken(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const chain = config.customTokenChain || "base";
      try {
        const pairRes = await fetch(
          `/api/nexus/pair?chainId=${chain}&address=${encodeURIComponent(ca)}`,
          { cache: "no-store", signal: AbortSignal.timeout(10_000) },
        );
        const pair = await pairRes.json();
        if (cancelled) return;
        const sym = config.customTokenSymbol.trim() || pair.symbol || "TOKEN";
        setResolvedToken({
          symbol: sym,
          name: pair.name ?? sym,
          tokenAddress: ca,
          chainId: chain,
          pairAddress: pair.pairAddress ?? "",
          priceUsd: pair.priceUsd ?? 0,
          change24h: pair.change24h ?? 0,
          volume24h: pair.volume24h ?? 0,
          liquidityUsd: pair.liquidityUsd ?? 0,
          url: pair.url ?? "",
          icon: pair.icon,
        });
      } catch {
        if (!cancelled) {
          const sym = config.customTokenSymbol.trim() || "TOKEN";
          setResolvedToken({
            symbol: sym,
            name: sym,
            tokenAddress: ca,
            chainId: chain,
            pairAddress: "",
            priceUsd: 0,
            change24h: 0,
            volume24h: 0,
            liquidityUsd: 0,
            url: "",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    config.customTokenAddress,
    config.customTokenSymbol,
    config.customTokenChain,
    config.amountMode,
  ]);

  const resolveAmounts = useCallback(
    (
      cfg: AutopilotConfig,
      side: "buy" | "sell",
      positionAmount: number,
      priceUsd: number,
      buyBalanceUsdc?: number,
    ): { usdcAmount?: number; tokenAmount?: number } => {
      if (side === "buy") {
        if (cfg.amountMode === "custom_usdc") {
          const tbnb = Math.max(0, Number(cfg.customUsdc) || 0);
          return { usdcAmount: tbnb * bnbSpotUsd };
        }
        if (cfg.amountMode === "custom_token" && cfg.customAmountUnit === "usdc") {
          const tbnb = Math.max(0, Number(cfg.customToken) || 0);
          return { usdcAmount: tbnb * bnbSpotUsd };
        }
        const avail = Math.max(0, (buyBalanceUsdc ?? walletTbnbRef.current * bnbSpotUsd) - 0.01 * bnbSpotUsd);
        return { usdcAmount: Math.max(0.05 * bnbSpotUsd, (avail * cfg.percent) / 100) };
      }
      if (cfg.amountMode === "custom_token") {
        if (cfg.customAmountUnit === "usdc" && priceUsd > 0) {
          const tbnb = Math.max(0, Number(cfg.customToken) || 0);
          return { tokenAmount: (tbnb * bnbSpotUsd) / priceUsd };
        }
        return { tokenAmount: Math.max(0, Number(cfg.customToken) || 0) };
      }
      return { tokenAmount: (positionAmount * cfg.percent) / 100 };
    },
    [bnbSpotUsd],
  );

  const recordExecutedTrade = useCallback(() => {
    const cap = effectiveMaxTrades(configRef.current);
    if (cap <= 0) return false;
    tradesExecutedRef.current += 1;
    setTradesExecuted(tradesExecutedRef.current);
    if (tradesExecutedRef.current >= cap) {
      if (recurringTimerRef.current) clearTimeout(recurringTimerRef.current);
      startedRef.current = false;
      persist({ ...configRef.current, recurringEnabled: false });
      pushLog(`Max trades (${cap}) reached — agent stopped`, "info");
      toast({
        type: "info",
        title: "Trade limit reached",
        message: `Completed ${cap} trade${cap === 1 ? "" : "s"} on your schedule. Start again to continue.`,
      });
      return true;
    }
    return false;
  }, [persist, pushLog, toast]);

  const runCycle = useCallback(async (trigger: "recurring" | "once" = "recurring") => {
    const swapT = activeToken();
    const analysisRow = analysisTokenRef.current ?? swapT;
    const cfg = configRef.current;
    if (!address) {
      toast({ type: "error", title: "Connect wallet", message: "Connect your wallet to run the agent." });
      return;
    }
    if (!swapT) {
      toast({
        type: "error",
        title: "Select a token",
        message:
          configRef.current.amountMode === "custom_token"
            ? "Enter a valid custom token address and wait for pair lookup."
            : "Pick a token from the desk feed first.",
      });
      return;
    }
    if (trigger === "recurring" && !cfg.recurringEnabled) return;

    if (trigger === "recurring" && recurringTimerRef.current) {
      clearTimeout(recurringTimerRef.current);
      recurringTimerRef.current = null;
    }

    if (trigger === "once") onceRunningRef.current = true;
    setRunning(true);
    try {
      let agent: { action?: string; confidence?: number; whyAction?: string; reasoning?: string } | null =
        analysisRow?.agent ?? swapT.agent ?? null;

      if (cfg.mode === "follow_agent" || cfg.mode === "follow_direction") {
        if (analysisRow?.agent?.action) {
          agent = analysisRow.agent;
        } else if (swapT.agent?.action) {
          agent = swapT.agent;
        } else {
          const analyzeRes = await fetch("/api/nexus/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chainId: analysisRow?.chainId ?? swapT.chainId,
              tokenAddress: analysisRow?.tokenAddress ?? swapT.tokenAddress,
              quick: true,
              deep: false,
              save: false,
            }),
            signal: AbortSignal.timeout(20_000),
          });
          const { ok, data: analyzeJson, error } = await readApiJson<{
            agent?: typeof agent;
            security?: { honeypotRisk?: boolean; label?: string };
            error?: string;
          }>(analyzeRes);
          if (!ok) {
            throw new Error(analyzeJson.error ?? error ?? "Analyze failed");
          }
          agent = analyzeJson.agent ?? null;
          if (analyzeJson.security?.honeypotRisk) {
            pushLog(`Security halt: ${analyzeJson.security.label}`, "error");
            return;
          }
        }
        if (agent?.whyAction) setLastReasoning(agent.whyAction);
        else if (agent?.reasoning) setLastReasoning(agent.reasoning);
      }

      let pulse: MarketPulse | null = null;
      try {
        const pulseRes = await fetch(
          `/api/nexus/market-pulse?symbol=${encodeURIComponent(analysisRow?.symbol ?? swapT.symbol)}`,
          { cache: "no-store", signal: AbortSignal.timeout(12_000) },
        );
        if (pulseRes.ok) pulse = (await pulseRes.json()) as MarketPulse;
      } catch {
        /* pulse optional */
      }

      let signal = cfg.mode === "follow_agent" ? agent : null;
      if (signal?.action && pulse?.ok) {
        const raw = signal.action.toUpperCase();
        const normalized =
          raw === "BUY" || raw === "SELL" || raw === "HOLD" ? (raw as "BUY" | "SELL" | "HOLD") : "HOLD";
        const adjusted = pulseAdjustAgentAction(pulse, normalized);
        if (adjusted !== normalized) {
          pushLog(
            `Market pulse · ${pulse.cascadeLevel} stress · agent ${normalized} → ${adjusted}`,
            "info",
          );
          signal = { ...signal, action: adjusted };
          setLastReasoning(`${pulse.headline} · Adjusted to ${adjusted}.`);
        } else if (pulse.headline) {
          setLastReasoning((prev) => (prev ? `${pulse.headline} · ${prev}` : pulse.headline));
        }
      } else if (pulse?.headline && cfg.mode === "follow_agent") {
        setLastReasoning((prev) => (prev ? `${pulse.headline} · ${prev}` : pulse.headline));
      }

      let side: "buy" | "sell" | null = null;
      let userOverride = false;
      let hedgeToStable = false;
      if (cfg.mode === "buy_only") {
        side = "buy";
        setLastReasoning(
          (prev) =>
            prev ??
            `Your schedule · buy only · ${cfg.scheduleMode === "once" ? "one-time" : cfg.interval}`,
        );
      } else if (cfg.mode === "sell_only") {
        side = "sell";
        setLastReasoning((prev) => prev ?? "Your schedule · sell only");
      } else if (cfg.mode === "data_desk") {
        /* resolved after portfolio + /api/nexus/autopilot/cycle */
      } else if (cfg.mode === "follow_direction") {
      } else if (!signal) {
        pushLog("No signal — skipped", "error");
        return;
      } else if (signal.action === "BUY") {
        side = "buy";
      } else if (signal.action === "SELL") {
        side = "sell";
      } else if (cfg.holdAction === "buy") {
        side = "buy";
        userOverride = true;
      } else if (cfg.holdAction === "sell") {
        side = "sell";
        userOverride = true;
      }
      if (!side && cfg.mode !== "follow_direction" && cfg.mode !== "data_desk") {
        const holdMsg = `AI ${signal?.action ?? "HOLD"} — no trade (open Trade rules → Buy anyway / Sell anyway on HOLD)`;
        pushLog(holdMsg, "info");
        toast({ type: "info", title: "No trade this cycle", message: holdMsg });
        return;
      }
      if (userOverride && signal && side) {
        pushLog(`Your choice · AI ${signal.action} · ${side.toUpperCase()} anyway`, "info");
      }

      let walletBal = walletTbnbRef.current;
      const buyFundingUsd = walletBal * bnbSpotUsd;
      const need = minVaultUsdcForAutopilot(cfg, buyFundingUsd, bnbSpotUsd);
      if (side === "buy" && buyFundingUsd < need) {
        const msg = `Wallet ${walletBal.toFixed(4)} tBNB (~$${buyFundingUsd.toFixed(2)}) — need ~$${need.toFixed(2)} for this cycle. Fund BSC Testnet wallet or lower size.`;
        pushLog(msg, "error");
        if (trigger === "once") {
          toast({ type: "error", title: "Insufficient tBNB", message: msg });
        } else {
          persist({ ...configRef.current, recurringEnabled: false });
          startedRef.current = false;
          if (recurringTimerRef.current) clearTimeout(recurringTimerRef.current);
          pushLog("Recurring stopped — wallet balance too low", "error");
          toast({ type: "error", title: "Recurring paused", message: msg });
        }
        return;
      }

      const sessionTx = getValidSessionHash();
      if (!sessionTx) {
        if (trigger === "recurring") {
          persist({ ...configRef.current, recurringEnabled: false });
          startedRef.current = false;
        }
        pushLog("Session expired — authorize again (one wallet signature)", "error");
        toast({
          type: "error",
          title: "Authorization required",
          message: "Tap Run Agent and connect on BSC Testnet.",
        });
        return;
      }

      const portRes = await fetch(`/api/nexus/demo/portfolio?wallet=${address}&t=${Date.now()}`);
      const { ok: portOk, data: portData, error: portErr } = await readApiJson<{
        positions?: Array<{ tokenAddress: string; tokenAmount?: number }>;
        error?: string;
      }>(portRes);
      let positionAmount = 0;
      if (portOk) {
        const position = (portData.positions ?? []).find(
          (p: { tokenAddress: string; tokenAmount?: number }) =>
            p.tokenAddress.toLowerCase() === swapT.tokenAddress.toLowerCase(),
        );
        positionAmount = position?.tokenAmount ?? 0;
      }
      if (side === "sell" || cfg.mode === "data_desk") {
        if (address) {
          try {
            positionAmount = await fetchDeskTokenBalance(address, swapT);
          } catch {
            /* keep ledger fallback */
          }
        }
      }

      const deskSymbol = analysisRow?.symbol ?? swapT.symbol;

      if (cfg.mode === "data_desk") {
        const deskQ = new URLSearchParams({
          symbol: deskSymbol,
          venue: cfg.venue,
          hasPosition: positionAmount > 0 ? "1" : "0",
          futLev: String(clampFuturesLeverage(cfg.futuresLeverage ?? 3)),
          marginPct: String(cfg.marginPercent ?? 25),
        });
        const cycleRes = await fetch(`/api/nexus/autopilot/cycle?${deskQ}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
        });
        const cycle = (await cycleRes.json()) as AutopilotDeskCycle & { error?: string };
        if (!cycleRes.ok || !cycle.ok) {
          pushLog(cycle.error ?? "Autopilot desk cycle failed", "error");
          return;
        }
        setLastReasoning(cycle.thesis);
        pushLog(`Desk ${cycle.action} · ${cycle.method}`, "info");

        if (cfg.venue === "futures" && !cycle.execute.tradeThisCycle) {
          pushLog(`Futures check — ${cycle.thesis}`, "info");
          toast({
            type: "info",
            title: `Futures ${cycle.execute.futuresSignal}`,
            message: cycle.execute.venueNote,
          });
          return;
        }

        if (!cycle.execute.tradeThisCycle) {
          pushLog(`Market check — ${cycle.thesis}`, "info");
          setLastReasoning(cycle.thesis);
          return;
        }

        if (cycle.execute.spotSide === "buy") side = "buy";
        else if (cycle.execute.spotSide === "sell") {
          side = "sell";
          hedgeToStable = cycle.execute.hedgeToStable;
        } else {
          pushLog(cycle.execute.venueNote, "info");
          return;
        }

        if (cfg.venue === "futures") {
          pushLog(
            `Futures ${cycle.execute.futuresSignal.toUpperCase()} → Chapel ${side}${hedgeToStable ? " → USDC" : ""}`,
            "info",
          );
        }
      } else if (cfg.mode === "follow_direction") {
        const agentQ = agent?.action ? `&agent=${encodeURIComponent(agent.action)}` : "";
        const routeRes = await fetch(
          `/api/nexus/position-route?symbol=${encodeURIComponent(deskSymbol)}&hasPosition=${positionAmount > 0 ? 1 : 0}${agentQ}`,
          { cache: "no-store", signal: AbortSignal.timeout(12_000) },
        );
        const dr = (await routeRes.json()) as PositionRoute & { error?: string };
        if (!routeRes.ok || !dr.ok) {
          pushLog(dr.error ?? "Direction route failed", "error");
          return;
        }
        setLastReasoning(`${dr.direction} · ${dr.execution.path} · ${dr.confidence}%`);
        pushLog(`Direction ${dr.direction} · ${dr.execution.path}`, "info");
        if (dr.execution.kind === "long_tbnb") side = "buy";
        else if (dr.execution.kind === "short_stable") {
          side = "sell";
          hedgeToStable = true;
        } else if (dr.execution.kind === "exit_tbnb") side = "sell";
        else {
          pushLog(`Direction FLAT — ${dr.execution.path}`, "info");
          toast({ type: "info", title: "Flat this cycle", message: dr.execution.path });
          return;
        }
      }

      if (!side) {
        pushLog("No executable direction this cycle", "info");
        return;
      }

      const { usdcAmount, tokenAmount } = resolveAmounts(
        cfg,
        side,
        positionAmount,
        swapT.priceUsd,
        buyFundingUsd,
      );

      if (side === "buy" && (!usdcAmount || usdcAmount / bnbSpotUsd < 0.0001)) {
        const msg = "Buy size too small (min 0.0001 tBNB) — check amount settings";
        pushLog(msg, "error");
        toast({ type: "error", title: "Amount too small", message: msg });
        return;
      }
      if (side === "sell" && (!tokenAmount || tokenAmount <= 0)) {
        const msg = "Nothing to sell — buy this token on-chain first or lower sell size";
        pushLog(msg, "error");
        toast({ type: "error", title: "No position", message: msg });
        return;
      }

      if (!canSwapOnBscTestnet(swapT)) {
        const msg = `${deskSymbol} has no Chapel route — pick BNB, CAKE, BUSD, or USDC.`;
        pushLog(msg, "error");
        toast({ type: "error", title: "Not swappable", message: msg });
        return;
      }

      if (side === "buy" && !canExecuteBuy) {
        const msg = "Constitution blocked buy — permit not granted for this symbol.";
        pushLog(msg, "error");
        toast({ type: "error", title: "Permit blocked", message: msg });
        return;
      }

      await ensureBscNetwork();

      if (side === "buy") {
        const tbnbSpend = (usdcAmount ?? 0) / bnbSpotUsd;
        if (tbnbSpend > walletTbnbRef.current - 0.0005) {
          const msg = `Need ${tbnbSpend.toFixed(4)} tBNB — wallet has ${walletTbnbRef.current.toFixed(4)}`;
          pushLog(msg, "error");
          toast({ type: "error", title: "Insufficient tBNB", message: msg });
          return;
        }
        pushLog(`Signing buy ~${tbnbSpend.toFixed(4)} tBNB → ${swapT.symbol} (${deskSymbol} thesis)…`, "info");
        const result = await swapNativeForToken({
          symbol: swapT.symbol,
          tokenAddress: swapT.tokenAddress,
          chainId: swapT.chainId,
          tbnbAmount: String(tbnbSpend),
        });
        const outAmt = parseFloat(result.amountOutFormatted) || 0;
        try {
          await fetch("/api/nexus/demo/trade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wallet: address,
              side: "buy",
              symbol: swapT.symbol,
              thesisSymbol: deskSymbol,
              tokenAddress: swapT.tokenAddress,
              sourceChain: swapT.chainId,
              tradeNetwork: "bsc",
              usdcAmount: tbnbSpend * bnbSpotUsd,
              tokenAmount: outAmt,
              priceUsd: swapT.priceUsd,
              arcFeeTxHash: result.hash,
            }),
          });
        } catch {
          /* optional ledger */
        }
        pushLog(`Buy confirmed · ${result.summary}`, "trade");
        toast({ type: "success", title: "Autopilot buy", message: result.summary });
        appendMeridianActivity({
          kind: "trade",
          level: "success",
          message: `Autopilot BUY ${deskSymbol} via ${swapT.symbol} · ${result.summary}`,
          symbol: deskSymbol,
          txHash: result.hash,
        });
      } else if (hedgeToStable) {
        const usdc = BSC_TESTNET_CATALOG.find((c) => c.symbol === "USDC")!;
        pushLog(`Short hedge · ${tokenAmount?.toFixed(4) ?? "0"} ${swapT.symbol} → USDC…`, "info");
        const result = await swapTokenForToken({
          paySymbol: swapT.symbol,
          payAddress: swapT.tokenAddress,
          payChainId: swapT.chainId,
          receiveSymbol: "USDC",
          receiveAddress: usdc.tokenAddress,
          receiveChainId: String(BSC_CHAIN_ID),
          tokenAmount: String(tokenAmount),
        });
        pushLog(`Hedge confirmed · ${result.summary}`, "trade");
        toast({ type: "success", title: "Autopilot short hedge", message: result.summary });
        appendMeridianActivity({
          kind: "trade",
          level: "success",
          message: `Autopilot SHORT ${deskSymbol} via ${swapT.symbol} · ${result.summary}`,
          symbol: deskSymbol,
          txHash: result.hash,
        });
      } else {
        const result = await swapTokenForNative({
          symbol: swapT.symbol,
          tokenAddress: swapT.tokenAddress,
          chainId: swapT.chainId,
          tokenAmount: String(tokenAmount),
        });
        const outAmt = parseFloat(result.amountOutFormatted) || 0;
        try {
          await fetch("/api/nexus/demo/trade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wallet: address,
              side: "sell",
              symbol: swapT.symbol,
              thesisSymbol: deskSymbol,
              tokenAddress: swapT.tokenAddress,
              sourceChain: swapT.chainId,
              tradeNetwork: "bsc",
              usdcAmount: outAmt * bnbSpotUsd,
              tokenAmount: tokenAmount ?? 0,
              priceUsd: swapT.priceUsd,
              arcFeeTxHash: result.hash,
            }),
          });
        } catch {
          /* optional ledger */
        }
        pushLog(`Sell confirmed · ${result.summary}`, "trade");
        toast({ type: "success", title: "Autopilot sell", message: result.summary });
        appendMeridianActivity({
          kind: "trade",
          level: "success",
          message: `Autopilot SELL ${deskSymbol} via ${swapT.symbol} · ${result.summary}`,
          symbol: deskSymbol,
          txHash: result.hash,
        });
      }

      onTradeComplete?.();
      recordExecutedTrade();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Autopilot failed";
      pushLog(msg, "error");
      toast({ type: "error", title: "Autopilot error", message: msg });
    } finally {
      if (trigger === "once") onceRunningRef.current = false;
      setRunning(false);
      const live = configRef.current;
      if (trigger === "recurring" && live.recurringEnabled) {
        const wait = autopilotIntervalMs(live);
        setNextIn(Math.floor(wait / 1000));
        recurringTimerRef.current = setTimeout(
          () => void runCycleRef.current("recurring"),
          wait,
        );
      }
    }
  }, [
    activeToken,
    address,
    getValidSessionHash,
    onTradeComplete,
    persist,
    pushLog,
    resolveAmounts,
    toast,
    bnbSpotUsd,
    canExecuteBuy,
    ensureBscNetwork,
    swapNativeForToken,
    swapTokenForNative,
    recordExecutedTrade,
  ]);

  runCycleRef.current = runCycle;

  const stopRecurring = useCallback(() => {
    if (recurringTimerRef.current) clearTimeout(recurringTimerRef.current);
    startedRef.current = false;
    setNextIn(0);
    persist({ ...configRef.current, recurringEnabled: false });
    if (!onceRunningRef.current && !onceTimerRef.current) {
      clearAutopilotSession();
      sessionRef.current = null;
    }
    pushLog("Recurring agent stopped", "info");
    toast({
      type: "success",
      title: "Recurring stopped",
      message: "Interval trades paused. One-time runs can still be started.",
    });
  }, [persist, pushLog, toast]);

  const authorizeAndStart = useCallback(async () => {
    if (!address) return;
    const picked = activeToken();
    if (!picked) {
      toast({
        type: "error",
        title: "Select a token",
        message: "Choose a token from the feed before starting the agent.",
      });
      return;
    }

    const intent = startIntentRef.current;
    setPermissionOpen(false);
    setGranting(true);
    try {
      const cfgNow = configRef.current;
      const walletBal = walletTbnbRef.current;
      const walletUsdNow = walletBal * bnbSpotUsd;
      const need = minVaultUsdcForAutopilot(cfgNow, walletUsdNow, bnbSpotUsd);

      if (cfgNow.mode !== "sell_only" && cfgNow.venue === "spot" && walletUsdNow < need) {
        toast({
          type: "error",
          title: "Fund wallet first",
          message: `Need ~$${need.toFixed(2)} tBNB on ${BSC_CHAIN_LABEL} for buys. Balance ~$${walletUsdNow.toFixed(2)} (${walletBal.toFixed(4)} tBNB).`,
        });
        return;
      }

      void syncDeposits().catch(() => {});

      const cfg = configRef.current;
      let sessionTx = getValidSessionHash();

      if (!sessionTx) {
        setAwaitingWallet(true);
        setGranting(false);
        await ensureBscNetwork();
        toast({
          type: "info",
          title: "Check your wallet",
          message: `Confirm on ${BSC_CHAIN_LABEL} to start the agent.`,
        });
        const fee = await payArcFee("AUTOPILOT_SESSION", buildSessionPayload(cfg, address), {
          waitReceipt: false,
        });
        setAwaitingWallet(false);
        const grant: AutopilotSessionGrant = {
          arcFeeTxHash: fee.txHash,
          owner: address,
          scheduleMode: intent === "once" ? "once" : "recurring",
          intervalLabel: sessionIntervalLabel(cfg),
          grantedAt: Date.now(),
          expiresAt: Date.now() + autopilotSessionExpiryMs(intent === "once" ? "once" : "recurring"),
        };
        saveAutopilotSession(grant);
        sessionRef.current = grant;
        sessionTx = fee.txHash;
      }

      if (intent === "recurring") {
        tradesExecutedRef.current = 0;
        setTradesExecuted(0);
        const next = { ...cfg, recurringEnabled: true };
        persist(next);
        startedRef.current = true;
        if (recurringTimerRef.current) clearTimeout(recurringTimerRef.current);
        const cap = effectiveMaxTrades(cfg);
        const capLabel = cap <= 0 ? "unlimited trades" : `${cap} trade${cap === 1 ? "" : "s"} max`;
        pushLog(
          `Recurring authorized · ${autopilotScheduleSummary(cfg)} · wallet ${walletBal.toFixed(4)} tBNB`,
          "info",
        );
        toast({
          type: "success",
          title: "Autopilot live",
          message: `${cfg.venue === "futures" ? "Futures signals" : "Spot Chapel"} · ${capLabel} · confirm each cycle in wallet.`,
        });
        await runCycleRef.current("recurring");
        return;
      }

      const delay = autopilotOnceDelayMs(cfg);
      pushLog(
        `One-time scheduled ${onceScheduleLabel(cfg)} · wallet ${walletBal.toFixed(4)} tBNB${cfg.recurringEnabled ? " · recurring still active" : ""}`,
        "info",
      );
      toast({
        type: "success",
        title: delay > 0 ? "One-time scheduled" : "Running one-time trade",
        message:
          delay > 0
            ? `Trade ${onceScheduleLabel(cfg)}. ${cfg.recurringEnabled ? "Recurring agent keeps running." : ""}`
            : `Executing now. ${cfg.recurringEnabled ? "Recurring agent keeps running." : ""}`,
      });

      if (delay > 0) {
        if (onceTimerRef.current) clearTimeout(onceTimerRef.current);
        onceTimerRef.current = setTimeout(() => {
          onceTimerRef.current = null;
          void runCycleRef.current("once");
        }, delay);
      } else {
        await runCycleRef.current("once");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not authorize agent";
      pushLog(msg, "error");
      toast({ type: "error", title: "Authorization failed", message: msg });
      if (startIntentRef.current === "recurring") {
        persist({ ...configRef.current, recurringEnabled: false });
        startedRef.current = false;
      }
    } finally {
      setGranting(false);
      setAwaitingWallet(false);
    }
  }, [
    address,
    activeToken,
    bnbSpotUsd,
    ensureBscNetwork,
    getValidSessionHash,
    payArcFee,
    persist,
    pushLog,
    syncDeposits,
    toast,
  ]);

  const displaySymbol =
    config.amountMode === "custom_token" && config.customTokenAddress
      ? config.customTokenSymbol || "Custom"
      : analysisToken?.symbol ?? token?.symbol ?? "—";

  /** Resume agent after page reload (Run Agent sets startedRef so this does not double-fire) */
  useEffect(() => {
    if (!config.recurringEnabled || !isConnected) {
      if (!config.recurringEnabled) {
        if (recurringTimerRef.current) clearTimeout(recurringTimerRef.current);
        startedRef.current = false;
        setNextIn(0);
      }
      return;
    }
    const t = activeToken();
    if (!t || startedRef.current) return;
    if (!getValidSessionHash()) {
      persist({ ...configRef.current, recurringEnabled: false });
      pushLog("Session expired after reload — tap Run Agent to sign once again", "info");
      return;
    }
    startedRef.current = true;
    void runCycleRef.current("recurring");
  }, [
    config.recurringEnabled,
    isConnected,
    token?.tokenAddress,
    resolvedToken?.tokenAddress,
    config.amountMode,
    config.customTokenAddress,
    getValidSessionHash,
    persist,
    pushLog,
  ]);

  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!config.recurringEnabled) {
      setNextIn(0);
      return;
    }
    const ms = autopilotIntervalMs(config);
    setNextIn(Math.floor(ms / 1000));
    countdownRef.current = setInterval(() => {
      setNextIn((s) => (s <= 1 ? Math.floor(ms / 1000) : s - 1));
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [config.recurringEnabled, config.interval, config.customIntervalMinutes]);

  useEffect(() => {
    onAgentLiveChange?.(config.recurringEnabled);
  }, [config.recurringEnabled, onAgentLiveChange]);

  useEffect(() => {
    setAgentRuntime({
      enabled: config.recurringEnabled,
      nextIn,
      running,
      logs,
      lastReasoning,
      displaySymbol,
      stop: stopRecurring,
      runNow: () => void runCycleRef.current("recurring"),
    });
  }, [config.recurringEnabled, nextIn, running, logs, lastReasoning, displaySymbol, stopRecurring]);

  useEffect(() => {
    return () => {
      if (onceTimerRef.current) clearTimeout(onceTimerRef.current);
      if (recurringTimerRef.current) clearTimeout(recurringTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (token) persist({ ...config, tokenKey: tokenKey(token.chainId, token.tokenAddress) });
  }, [token?.tokenAddress, token?.chainId]);

  const inner = (
    <div className="space-y-3">
      {!token && config.amountMode !== "custom_token" ? (
        <p className="text-sm text-white/55">Select a token from the feed, or use Custom Token mode.</p>
      ) : (
        <>
          {/* ── Overview ── */}
          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/8 to-cyan-500/5 px-3 py-2.5">
            <p className="text-[11px] font-semibold text-white">Manual vs Autopilot</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/60">
              <strong className="text-emerald-200">Buy / Sell tabs</strong> — you pick size and sign once per trade.{" "}
              <strong className="text-cyan-200">Autopilot</strong> — set interval + max trades below. Each
              tick is a <strong className="text-white">live market check</strong>; the agent buys/sells/signals
              only when CMC consensus, tape, and funding align — not on every minute blindly.
            </p>
          </div>

          {/* ── Wallet ── */}
          <NexusExecutionPanel compact />
          {!hasDeposit && (
            <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
              {config.mode === "sell_only" ? (
                <>
                  <strong className="text-amber-50">Sell mode.</strong> You need an open position in this token.
                  Wallet will only sign once to authorize on {BSC_CHAIN_LABEL}.
                </>
              ) : config.venue === "futures" ? (
                <>
                  <strong className="text-amber-50">Futures mode (Chapel).</strong> Long/short/close maps to
                  real PancakeSwap txs on {BSC_CHAIN_LABEL} — fund tBNB for longs.
                </>
              ) : (
                <>
                  <strong className="text-amber-50">Fund wallet on BSC Testnet.</strong> Need ~
                  {(requiredUsdc / Math.max(bnbSpotUsd, 1)).toFixed(4)} tBNB (~${requiredUsdc.toFixed(2)}) for buys.
                  Balance: {walletTbnb.toFixed(4)} tBNB (~${walletUsd.toFixed(2)}).
                </>
              )}
            </div>
          )}
          {gateIntent && (
            <p className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-[11px] leading-relaxed text-violet-100">
              Gate signal · <strong>{gateIntent.direction}</strong> · {gateIntent.leverage}x thesis ·{" "}
              <strong>data desk autopilot</strong> — rules from live CMC + pulse, not market prediction.
            </p>
          )}

          {/* ── Step 1 · Venue ── */}
          <p className="nexus-caption flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Step 1 · Trading venue
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "spot" as AutopilotVenue, label: "Spot", sub: "Chapel swaps · wallet signs each tx" },
                { id: "futures" as AutopilotVenue, label: "Futures", sub: "Spot-as-futures · Chapel on-chain" },
              ] as const
            ).map(({ id, label, sub }) => (
              <button
                key={id}
                type="button"
                onClick={() => persist({ ...config, venue: id })}
                className={`rounded-xl border px-3 py-2.5 text-left ${
                  config.venue === id
                    ? "border-cyan-400/40 bg-cyan-500/12 text-cyan-50"
                    : "border-white/10 text-white/55"
                }`}
              >
                <span className="text-xs font-bold">{label}</span>
                <span className="mt-0.5 block text-[10px] text-white/45">{sub}</span>
              </button>
            ))}
          </div>

          {/* ── Step 2 · Schedule & trade count ── */}
          <p className="nexus-caption flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Step 2 · Schedule & trade count
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => persist({ ...config, scheduleMode: "recurring" })}
              className={`min-h-[44px] rounded-xl border text-xs font-bold ${
                config.scheduleMode === "recurring"
                  ? "border-violet-400/40 bg-violet-500/15 text-violet-100"
                  : "border-white/10 text-white/55"
              }`}
            >
              Repeat on interval
            </button>
            <button
              type="button"
              onClick={() => persist({ ...config, scheduleMode: "once" })}
              className={`min-h-[44px] rounded-xl border text-xs font-bold ${
                config.scheduleMode === "once"
                  ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                  : "border-white/10 text-white/55"
              }`}
            >
              Run once
            </button>
          </div>

          <p className="nexus-caption flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5" />
            {config.scheduleMode === "recurring" ? "Interval (between checks)" : "When to run (one-time)"}
          </p>
          {config.scheduleMode === "once" && (
            <div className="mb-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => persist({ ...config, onceRunWhen: "now" })}
                className={`min-h-[40px] rounded-xl border text-xs font-bold ${
                  config.onceRunWhen === "now"
                    ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                    : "border-white/10 text-white/55"
                }`}
              >
                Run now
              </button>
              <button
                type="button"
                onClick={() => persist({ ...config, onceRunWhen: "scheduled" })}
                className={`min-h-[40px] rounded-xl border text-xs font-bold ${
                  config.onceRunWhen === "scheduled"
                    ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                    : "border-white/10 text-white/55"
                }`}
              >
                Run after delay
              </button>
            </div>
          )}
          {(config.scheduleMode === "recurring" || config.onceRunWhen === "scheduled") && (
            <>
              <div className="grid grid-cols-5 gap-1.5">
                {INTERVAL_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => persist({ ...config, interval: key })}
                    className={`min-h-[40px] rounded-lg border text-[9px] font-bold leading-tight ${
                      config.interval === key
                        ? config.scheduleMode === "recurring"
                          ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
                          : "border-cyan-400/50 bg-cyan-500/20 text-cyan-100"
                        : "border-white/10 bg-black/20 text-white/55"
                    }`}
                  >
                    {key === "custom"
                      ? "Custom"
                      : AUTOPILOT_INTERVALS[key as Exclude<AutopilotInterval, "custom">]?.label ?? key}
                  </button>
                ))}
              </div>
              {config.interval === "custom" && (
                <div className="mt-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-violet-300" />
                  <input
                    inputMode="numeric"
                    value={config.customIntervalMinutes}
                    onChange={(e) => persist({ ...config, customIntervalMinutes: e.target.value })}
                    placeholder={
                      config.scheduleMode === "recurring"
                        ? "Minutes between trades"
                        : "Minutes until one trade"
                    }
                    className="min-h-[44px] flex-1 rounded-xl border border-white/15 bg-black/30 px-3 text-white"
                  />
                  <span className="text-xs text-white/50">min</span>
                </div>
              )}
            </>
          )}

          {config.scheduleMode === "recurring" && (
            <>
              <p className="nexus-caption flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5" />
                How many executions (when rules pass)
              </p>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                {MAX_TRADE_PRESETS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => persist({ ...config, maxTrades: value })}
                    className={`min-h-[40px] rounded-lg border text-[10px] font-bold ${
                      config.maxTrades === value
                        ? "border-emerald-400/45 bg-emerald-500/15 text-emerald-100"
                        : "border-white/10 text-white/55"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {config.maxTrades === -1 && (
                <div className="flex items-center gap-2">
                  <input
                    inputMode="numeric"
                    value={config.customMaxTrades}
                    onChange={(e) => persist({ ...config, customMaxTrades: e.target.value })}
                    placeholder="Max trades"
                    className="min-h-[44px] flex-1 rounded-xl border border-white/15 bg-black/30 px-3 text-white"
                  />
                  <span className="text-xs text-white/50">trades max</span>
                </div>
              )}
              <p className="text-[10px] text-white/45">
                Checks market every {sessionIntervalLabel(config)} · executes only when rules pass ·{" "}
                {effectiveMaxTrades(config) <= 0
                  ? "until you stop"
                  : `max ${effectiveMaxTrades(config)} trade${effectiveMaxTrades(config) === 1 ? "" : "s"}`}
                .
              </p>
            </>
          )}

          {/* ── Step 3 · Size / leverage ── */}
          <p className="nexus-caption flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5" />
            Step 3 · {config.venue === "futures" ? "Leverage & margin" : "Spot size"}
          </p>

          {config.venue === "futures" ? (
            <div className="space-y-3 rounded-xl border border-violet-400/20 bg-violet-500/5 p-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px] text-white/55">
                  <span>Perp leverage (your external venue)</span>
                  <span className="font-bold text-violet-200">{clampFuturesLeverage(config.futuresLeverage)}×</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={clampFuturesLeverage(config.futuresLeverage)}
                  onChange={(e) =>
                    persist({ ...config, futuresLeverage: clampFuturesLeverage(Number(e.target.value)) })
                  }
                  className="gate-leverage-slider w-full accent-violet-400"
                />
                <div className="mt-1 flex justify-between text-[9px] text-white/40">
                  {[1, 3, 5, 10, 20].map((t) => (
                    <span key={t}>{t}×</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] text-white/55">Margin budget per signal</p>
                <div className="grid grid-cols-4 gap-2">
                  {MARGIN_PCT_OPTIONS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => persist({ ...config, marginPercent: pct })}
                      className={`min-h-[40px] rounded-lg border text-sm font-bold ${
                        config.marginPercent === pct
                          ? "border-violet-400/45 bg-violet-500/15 text-violet-100"
                          : "border-white/10 text-white/60"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[10px] leading-relaxed text-white/50">
                Futures autopilot emits <strong className="text-white">long / short / close</strong> from live
                funding + OI + CMC consensus. Long/short/close execute as Chapel spot swaps on {BSC_CHAIN_LABEL}.
              </p>
            </div>
          ) : (
            <>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "percent" as AutopilotAmountMode, label: "% of tBNB", icon: Percent },
                { id: "custom_usdc" as AutopilotAmountMode, label: "Fixed tBNB", icon: DollarSign },
                { id: "custom_token" as AutopilotAmountMode, label: "Custom token", icon: TrendingDown },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => persist({ ...config, amountMode: id })}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border text-[10px] font-bold ${
                  config.amountMode === id
                    ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                    : "border-white/10 text-white/55"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {config.amountMode === "percent" && (
            <div className="grid grid-cols-4 gap-2">
              {PCT_OPTIONS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => persist({ ...config, percent: pct })}
                  className={`min-h-[40px] rounded-lg border text-sm font-bold ${
                    config.percent === pct
                      ? "border-cyan-400/45 bg-cyan-500/15 text-cyan-100"
                      : "border-white/10 text-white/60"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}

          {config.amountMode === "custom_usdc" && (
            <div>
              <p className="nexus-caption mb-1 flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> tBNB per buy
              </p>
              <input
                inputMode="decimal"
                value={config.customUsdc}
                onChange={(e) => persist({ ...config, customUsdc: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-white/15 bg-black/30 px-3 text-white"
                placeholder="e.g. 0.01"
              />
            </div>
          )}

          {config.amountMode === "custom_token" && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
              <NexusTokenSearchPicker
                chainId={config.customTokenChain || "base"}
                onChainChange={(chain) => persist({ ...config, customTokenChain: chain })}
                address={config.customTokenAddress}
                catalog={catalogTokens}
                onResolved={(pick) =>
                  persist({
                    ...config,
                    customTokenAddress: pick.tokenAddress,
                    customTokenSymbol: pick.symbol,
                    customTokenChain: pick.chainId,
                  })
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => persist({ ...config, customAmountUnit: "tokens" })}
                  className={`min-h-[40px] rounded-lg border text-xs font-bold ${
                    config.customAmountUnit === "tokens"
                      ? "border-rose-400/40 bg-rose-500/15 text-rose-100"
                      : "border-white/10 text-white/55"
                  }`}
                >
                  Token amount
                </button>
                <button
                  type="button"
                  onClick={() => persist({ ...config, customAmountUnit: "usdc" })}
                  className={`min-h-[40px] rounded-lg border text-xs font-bold ${
                    config.customAmountUnit === "usdc"
                      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                      : "border-white/10 text-white/55"
                  }`}
                >
                  tBNB amount
                </button>
              </div>
              <input
                inputMode="decimal"
                value={config.customToken}
                onChange={(e) => persist({ ...config, customToken: e.target.value })}
                placeholder={
                  config.customAmountUnit === "usdc" ? "tBNB per buy" : "Tokens per sell"
                }
                className="w-full min-h-[44px] rounded-xl border border-white/15 bg-black/30 px-3 text-white"
              />
            </div>
          )}
            </>
          )}

          <p className="rounded-xl border border-cyan-400/15 bg-cyan-500/5 px-3 py-2 text-[10px] leading-relaxed text-cyan-100/85">
            <strong className="text-white">Autonomous data desk</strong> — live CMC consensus, volume/mcap pulse,
            funding/OI, and tape guards. Interval = market check · trade only when rules pass · spot has no leverage
            multiplier.
          </p>

          {/* ── Step 4 · Live desk read (after config) ── */}
          {(token || resolvedToken) && (
            <>
              <p className="nexus-caption flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                Step 4 · Live desk read
              </p>
              <AutopilotDeskPreview
                symbol={(token ?? resolvedToken)?.symbol ?? null}
                venue={config.venue ?? "spot"}
                futuresLeverage={config.futuresLeverage}
                marginPercent={config.marginPercent}
              />
            </>
          )}

          {/* ── Runtime status ── */}
          {config.recurringEnabled && (
            <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              <strong className="text-emerald-50">Autopilot is live.</strong>{" "}
              {autopilotScheduleSummary(config)}
              {effectiveMaxTrades(config) > 0 && (
                <>
                  {" "}
                  · Trades {tradesExecuted}/{effectiveMaxTrades(config)}
                </>
              )}
            </p>
          )}
          {lastReasoning && (
            <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 px-3 py-2 text-xs leading-relaxed text-cyan-100/90">
              <Bot className="mr-1 inline h-3.5 w-3.5" />
              {lastReasoning}
            </p>
          )}

          {/* ── Start ── */}
          {permissionOpen && (
            <div
              className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center"
              role="dialog"
              aria-labelledby="autopilot-permission-title"
            >
              <div className="w-full max-w-md rounded-2xl border border-violet-400/35 bg-[#0c1018] p-4 shadow-2xl">
                <p
                  id="autopilot-permission-title"
                  className="flex items-center gap-2 text-base font-semibold text-white"
                >
                  <Shield className="h-5 w-5 text-violet-300" />
                  Start NEXUS Autopilot?
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  {config.venue === "futures" ? (
                    <>
                      Autopilot will run <strong className="text-violet-200">futures checks</strong> on your
                      schedule — {autopilotScheduleSummary(config)}. Long/short/close sign as Chapel swaps on{" "}
                      {BSC_CHAIN_LABEL}.
                    </>
                  ) : (
                    <>
                      You will <strong className="text-white">sign once</strong> on {BSC_CHAIN_LABEL} to unlock the
                      session, then <strong className="text-cyan-200">confirm each cycle</strong> in your wallet via
                      PancakeSwap — {autopilotScheduleSummary(config)}.
                    </>
                  )}
                </p>
                <ul className="mt-3 space-y-1 text-xs text-white/55">
                  <li>· Live CMC consensus + pulse — agent does not predict prices</li>
                  {config.venue === "spot" ? (
                    <>
                      <li>· Constitution permit must clear before autopilot buys</li>
                      <li>· Wallet signs each PancakeSwap swap on Chapel</li>
                    </>
                  ) : (
                    <>
                      <li>· {clampFuturesLeverage(config.futuresLeverage)}× leverage · {config.marginPercent}% margin sizing</li>
                      <li>· Long = buy Chapel proxy · Short = sell → USDC · Close = exit on Chapel</li>
                    </>
                  )}
                  <li>· Recurring and one-time runs are independent</li>
                </ul>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="min-h-[44px] flex-1 rounded-xl border border-white/15 text-sm font-semibold text-white/80"
                    onClick={() => setPermissionOpen(false)}
                    disabled={granting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={nexusGlassCta(
                      "autopilot",
                      "min-h-[44px] flex-1 text-sm font-bold",
                      true,
                    )}
                    onClick={() => void authorizeAndStart()}
                    disabled={granting}
                  >
                    {granting ? (
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    ) : (
                      "Authorize & start"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            className={nexusGlassCta(
              "autopilot",
              "inline-flex min-h-[48px] w-full items-center justify-center gap-2",
              (config.amountMode === "custom_usdc"
                ? Number(config.customUsdc) > 0
                : config.amountMode === "custom_token"
                  ? Number(config.customToken) > 0
                  : config.percent > 0) &&
                !(config.scheduleMode === "recurring" && config.recurringEnabled),
            )}
            disabled={
              !isConnected ||
              running ||
              granting ||
              awaitingWallet ||
              arcPending ||
              (config.scheduleMode === "recurring" && config.recurringEnabled)
            }
            onClick={() => {
              const picked = activeToken();
              if (!picked) {
                toast({
                  type: "error",
                  title: "Select a token",
                  message:
                    "Choose a token from the live feed (or set Custom token), then try again.",
                });
                return;
              }
              const intent = config.scheduleMode === "once" ? "once" : "recurring";
              startIntentRef.current = intent;
              setPermissionIntent(intent);
              setPermissionOpen(true);
            }}
          >
            {running || granting || awaitingWallet || arcPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {awaitingWallet || arcPending
              ? "Confirm in wallet…"
              : config.scheduleMode === "recurring" && config.recurringEnabled
                ? "Recurring running…"
                : config.scheduleMode === "once"
                  ? `Run one check${config.onceRunWhen === "scheduled" ? ` (${onceScheduleLabel(config)})` : ""}`
                  : "Start autonomous agent"}
          </button>
          <p className="text-center text-[10px] text-white/45">
            {config.venue === "futures"
              ? `${autopilotScheduleSummary(config)} — checks live tape; signals only when rules pass.`
              : config.scheduleMode === "recurring"
                ? `${autopilotScheduleSummary(config)} — checks every interval; Chapel swap only when desk clears.`
                : `One-time check: ${onceScheduleLabel(config)}.`}
          </p>
        </>
      )}
    </div>
  );

  const wrapped = <NexusAgentProvider value={agentRuntime}>{inner}</NexusAgentProvider>;

  if (embedded) return wrapped;

  return (
    <div className="arc-panel arc-panel-nexus overflow-hidden">
      <div className="arc-panel-stripe arc-panel-stripe-nexus" />
      <div className="flex items-center justify-between border-b border-violet-400/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-violet-200" />
          <span className="text-base font-semibold text-white">NEXUS Autopilot</span>
          {config.recurringEnabled && (
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
              RECURRING LIVE
            </span>
          )}
        </div>
        {config.recurringEnabled && nextIn > 0 && (
          <span className="flex items-center gap-1 text-xs text-violet-200/80">
            <Calendar className="h-3.5 w-3.5" />
            Next {nextIn}s
          </span>
        )}
      </div>
      <div className="p-4">{wrapped}</div>
    </div>
  );
}
