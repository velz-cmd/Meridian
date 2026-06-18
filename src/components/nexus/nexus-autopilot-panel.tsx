"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { useAgentWallet } from "@/hooks/use-agent-wallet";
import {
  AutopilotAmountMode,
  AUTOPILOT_INTERVALS,
  autopilotIntervalMs,
  autopilotOnceDelayMs,
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
} from "@/lib/nexus-autopilot";
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
  Bot,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  DollarSign,
  Loader2,
  Percent,
  Play,
  Settings2,
  Shield,
  Sparkles,
  Timer,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { useBnbSettlement } from "@/hooks/use-bnb-settlement";
import { useBnbSpotUsd } from "@/hooks/use-bnb-spot-usd";
import { usePancakeSwap } from "@/hooks/use-pancake-swap";
import { BSC_CHAIN_ID, BSC_CHAIN_LABEL } from "@/lib/bsc-chain";
import { canSwapOnBscTestnet, fetchDeskTokenBalance } from "@/lib/testnet-onchain";
import { useConstitution } from "@/contexts/nexus-constitution-context";
import { NexusAgentProvider, type NexusAgentRuntime } from "@/components/nexus/nexus-agent-context";
import { NexusCircleAgentCard } from "@/components/nexus/nexus-circle-agent-card";
import { NexusExecutionPanel } from "@/components/nexus/nexus-execution-panel";
import { NexusTokenSearchPicker } from "@/components/nexus/nexus-token-search-picker";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

const PCT_OPTIONS = [25, 50, 75, 100] as const;
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
  catalogTokens = [],
  onTradeComplete,
  embedded = false,
  onAgentLiveChange,
}: {
  token: TrendingMarketToken | null;
  /** Live feed tokens for unified name/CA search */
  catalogTokens?: TrendingMarketToken[];
  onTradeComplete?: () => void;
  embedded?: boolean;
  /** Only reports enabled state — avoids re-rendering Buy/Sell every second */
  onAgentLiveChange?: (live: boolean) => void;
}) {
  const toast = useToast();
  const { canExecuteBuy } = useConstitution();
  const { address, isConnected } = useAccount();
  const { data: walletBalance } = useBalance({ address, chainId: BSC_CHAIN_ID });
  const walletTbnb = walletBalance ? Number(walletBalance.formatted) : 0;
  const bnbSpotUsd = useBnbSpotUsd();
  const { swapNativeForToken, swapTokenForNative } = usePancakeSwap();
  const { usdcBalance: agentUsdc, refreshBalance, syncDeposits } = useAgentWallet();
  const { payArcFee, ensureBscNetwork, isPending: arcPending, feeUsd } = useBnbSettlement();
  const [config, setConfig] = useState<AutopilotConfig>(() => loadAutopilot());
  const [logs, setLogs] = useState<AutopilotLog[]>([]);
  const [lastReasoning, setLastReasoning] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [nextIn, setNextIn] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [resolvedToken, setResolvedToken] = useState<TrendingMarketToken | null>(null);
  const recurringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);
  const startIntentRef = useRef<"recurring" | "once">("recurring");
  const onceRunningRef = useRef(false);
  const configRef = useRef(config);
  const tokenRef = useRef(token);
  const resolvedRef = useRef(resolvedToken);
  const runCycleRef = useRef<(trigger?: "recurring" | "once") => Promise<void>>(async () => {});
  const agentUsdcRef = useRef(agentUsdc);
  const walletTbnbRef = useRef(walletTbnb);
  const sessionRef = useRef<AutopilotSessionGrant | null>(null);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [permissionIntent, setPermissionIntent] = useState<"recurring" | "once">("recurring");
  const [granting, setGranting] = useState(false);
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
  const requiredUsdc = minVaultUsdcForAutopilot(config, walletUsd);
  const hasDeposit = config.mode === "sell_only" || walletUsd >= requiredUsdc;

  const persist = useCallback((next: AutopilotConfig) => {
    configRef.current = next;
    setConfig(next);
    saveAutopilot(next);
  }, []);

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
          return { usdcAmount: Math.max(0, Number(cfg.customUsdc) || 0) };
        }
        if (cfg.amountMode === "custom_token" && cfg.customAmountUnit === "usdc") {
          return { usdcAmount: Math.max(0, Number(cfg.customToken) || 0) };
        }
        const avail = Math.max(0, (buyBalanceUsdc ?? walletTbnbRef.current * bnbSpotUsd) - 0.01);
        return { usdcAmount: Math.max(0.05, (avail * cfg.percent) / 100) };
      }
      if (cfg.amountMode === "custom_token") {
        if (cfg.customAmountUnit === "usdc" && priceUsd > 0) {
          const usdc = Math.max(0, Number(cfg.customToken) || 0);
          return { tokenAmount: usdc / priceUsd };
        }
        return { tokenAmount: Math.max(0, Number(cfg.customToken) || 0) };
      }
      return { tokenAmount: (positionAmount * cfg.percent) / 100 };
    },
    [bnbSpotUsd],
  );

  const runCycle = useCallback(async (trigger: "recurring" | "once" = "recurring") => {
    const t = activeToken();
    const cfg = configRef.current;
    if (!address) {
      toast({ type: "error", title: "Connect wallet", message: "Connect your wallet to run the agent." });
      return;
    }
    if (!t) {
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
        t.agent ?? null;

      if (cfg.mode === "follow_agent") {
        if (t.agent?.action) {
          agent = t.agent;
        } else {
          const analyzeRes = await fetch("/api/nexus/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chainId: t.chainId,
              tokenAddress: t.tokenAddress,
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

      const signal = cfg.mode === "follow_agent" ? agent : null;

      let side: "buy" | "sell" | null = null;
      let userOverride = false;
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
      if (!side) {
        const holdMsg = `AI ${signal?.action ?? "HOLD"} — no trade (open Trade rules → Buy anyway / Sell anyway on HOLD)`;
        pushLog(holdMsg, "info");
        toast({ type: "info", title: "No trade this cycle", message: holdMsg });
        return;
      }
      if (userOverride && signal) {
        pushLog(`Your choice · AI ${signal.action} · ${side.toUpperCase()} anyway`, "info");
      }

      let walletBal = walletTbnbRef.current;
      const buyFundingUsd = walletBal * bnbSpotUsd;
      const need = minVaultUsdcForAutopilot(cfg, buyFundingUsd);
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
            p.tokenAddress.toLowerCase() === t.tokenAddress.toLowerCase(),
        );
        positionAmount = position?.tokenAmount ?? 0;
      }
      if (side === "sell" && address) {
        try {
          positionAmount = await fetchDeskTokenBalance(address, t);
        } catch {
          /* keep ledger fallback */
        }
      }

      const { usdcAmount, tokenAmount } = resolveAmounts(
        cfg,
        side,
        positionAmount,
        t.priceUsd,
        buyFundingUsd,
      );

      if (side === "buy" && (!usdcAmount || usdcAmount < 0.05)) {
        const msg = "Buy size too small (min $0.05 USDC) — check amount settings";
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

      if (!canSwapOnBscTestnet(t)) {
        const msg = `${t.symbol} is not on the BSC Testnet desk — pick BNB, CAKE, BUSD, or USDC.`;
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
        pushLog(`Signing buy ~${tbnbSpend.toFixed(4)} tBNB → ${t.symbol}…`, "info");
        const result = await swapNativeForToken({
          symbol: t.symbol,
          tokenAddress: t.tokenAddress,
          chainId: t.chainId,
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
              symbol: t.symbol,
              tokenAddress: t.tokenAddress,
              sourceChain: t.chainId,
              tradeNetwork: "bsc",
              usdcAmount: tbnbSpend * bnbSpotUsd,
              tokenAmount: outAmt,
              priceUsd: t.priceUsd,
              arcFeeTxHash: result.hash,
            }),
          });
        } catch {
          /* optional ledger */
        }
        pushLog(`Buy confirmed · ${result.summary}`, "trade");
        toast({ type: "success", title: "Autopilot buy", message: result.summary });
      } else {
        pushLog(`Signing sell ${tokenAmount?.toFixed(4) ?? "0"} ${t.symbol}…`, "info");
        const result = await swapTokenForNative({
          symbol: t.symbol,
          tokenAddress: t.tokenAddress,
          chainId: t.chainId,
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
              symbol: t.symbol,
              tokenAddress: t.tokenAddress,
              sourceChain: t.chainId,
              tradeNetwork: "bsc",
              usdcAmount: outAmt * bnbSpotUsd,
              tokenAmount: tokenAmount ?? 0,
              priceUsd: t.priceUsd,
              arcFeeTxHash: result.hash,
            }),
          });
        } catch {
          /* optional ledger */
        }
        pushLog(`Sell confirmed · ${result.summary}`, "trade");
        toast({ type: "success", title: "Autopilot sell", message: result.summary });
      }

      onTradeComplete?.();
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
      const need = minVaultUsdcForAutopilot(cfgNow, walletUsdNow);

      if (cfgNow.mode !== "sell_only" && walletUsdNow < need) {
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
        const next = { ...cfg, recurringEnabled: true };
        persist(next);
        startedRef.current = true;
        if (recurringTimerRef.current) clearTimeout(recurringTimerRef.current);
        pushLog(
          `Recurring authorized · every ${sessionIntervalLabel(cfg)} · wallet ${walletBal.toFixed(4)} tBNB`,
          "info",
        );
        toast({
          type: "success",
          title: "Recurring agent live",
          message: `Cycles every ${sessionIntervalLabel(cfg)} — confirm each PancakeSwap tx in your wallet.`,
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
      : token?.symbol ?? "—";

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
          <NexusCircleAgentCard compact />
          <NexusExecutionPanel compact />

          {!hasDeposit && (
            <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
              {config.mode === "sell_only" ? (
                <>
                  <strong className="text-amber-50">Sell mode.</strong> You need an open position in this
                  token. Wallet will only sign once to authorize on {BSC_CHAIN_LABEL}.
                </>
              ) : (
                <>
                  <strong className="text-amber-50">Fund wallet on BSC Testnet.</strong> Need ~
                  {(requiredUsdc / Math.max(bnbSpotUsd, 1)).toFixed(4)} tBNB (~${requiredUsdc.toFixed(2)}) for
                  buys. Balance: {walletTbnb.toFixed(4)} tBNB (~${walletUsd.toFixed(2)}).
                </>
              )}
            </div>
          )}

          {lastReasoning && (
            <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 px-3 py-2 text-xs leading-relaxed text-cyan-100/90">
              <Bot className="mr-1 inline h-3.5 w-3.5" />
              {lastReasoning}
            </p>
          )}

          <p className="nexus-caption flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Schedule
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

          {config.recurringEnabled && (
            <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              <strong className="text-emerald-50">Recurring agent is live.</strong> You can still run one-time
              trades — they will not stop the interval agent.
            </p>
          )}

          <p className="nexus-caption flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5" />
            {config.scheduleMode === "recurring" ? "Interval (between trades)" : "When to run (one-time)"}
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

          <p className="nexus-caption flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5" />
            Trade size (simple)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "percent" as AutopilotAmountMode, label: "% of USDC", icon: Percent },
                { id: "custom_usdc" as AutopilotAmountMode, label: "Fixed USDC", icon: DollarSign },
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
                <DollarSign className="h-3 w-3" /> USDC per buy
              </p>
              <input
                inputMode="decimal"
                value={config.customUsdc}
                onChange={(e) => persist({ ...config, customUsdc: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-white/15 bg-black/30 px-3 text-white"
                placeholder="e.g. 25"
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
                  USDC amount
                </button>
              </div>
              <input
                inputMode="decimal"
                value={config.customToken}
                onChange={(e) => persist({ ...config, customToken: e.target.value })}
                placeholder={
                  config.customAmountUnit === "usdc" ? "USDC per buy" : "Tokens per sell"
                }
                className="w-full min-h-[44px] rounded-xl border border-white/15 bg-black/30 px-3 text-white"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setAdvancedOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/75"
          >
            <span className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-violet-300" />
              Trade rules (AI BUY / SELL)
            </span>
            {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {advancedOpen && (
            <div className="space-y-3 rounded-xl border border-violet-400/20 bg-violet-500/5 p-3">
              <p className="text-[11px] leading-relaxed text-white/65">
                You pick the token in the desk. Autopilot follows AI <strong className="text-emerald-300">BUY</strong> /{" "}
                <strong className="text-rose-300">SELL</strong>, or your override below when the desk says{" "}
                <strong className="text-white">HOLD</strong>.
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                Trading style
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "follow_agent" as const, label: "Follow AI", icon: Sparkles },
                    { id: "buy_only" as const, label: "Always buy", icon: TrendingUp },
                    { id: "sell_only" as const, label: "Always sell", icon: TrendingDown },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => persist({ ...config, mode: id })}
                    className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl border text-[10px] font-bold ${
                      config.mode === id
                        ? "border-violet-400/40 bg-violet-500/15 text-violet-100"
                        : "border-white/10 text-white/55"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
              {config.mode === "follow_agent" && (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                    When AI says HOLD — your choice
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "skip" as AutopilotHoldAction, label: "Skip" },
                        { id: "buy" as AutopilotHoldAction, label: "Buy anyway" },
                        { id: "sell" as AutopilotHoldAction, label: "Sell anyway" },
                      ] as const
                    ).map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => persist({ ...config, holdAction: id })}
                        className={`min-h-[40px] rounded-xl border px-2 text-[10px] font-bold ${
                          config.holdAction === id
                            ? id === "buy"
                              ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                              : id === "sell"
                                ? "border-rose-400/40 bg-rose-500/15 text-rose-100"
                                : "border-white/20 bg-white/10 text-white"
                            : "border-white/10 text-white/55"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

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
                  You will <strong className="text-white">sign once</strong> on {BSC_CHAIN_LABEL} to unlock the
                  session, then <strong className="text-cyan-200">confirm each cycle</strong> in your wallet via
                  PancakeSwap
                  {permissionIntent === "recurring"
                    ? ` every ${sessionIntervalLabel(config)}`
                    : ` — one trade ${onceScheduleLabel(config)}`}
                  .
                </p>
                <ul className="mt-3 space-y-1 text-xs text-white/55">
                  <li>· Keep tBNB on BSC Testnet for buy cycles</li>
                  <li>· Constitution permit must clear before autopilot buys</li>
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
                  ? `Run one trade${config.onceRunWhen === "scheduled" ? ` (${onceScheduleLabel(config)})` : ""}`
                  : "Start recurring agent"}
          </button>
          <p className="text-center text-[10px] text-white/45">
            {config.scheduleMode === "recurring"
              ? `Recurring runs every ${sessionIntervalLabel(config)} — wallet signs each PancakeSwap tx.`
              : `One-time: ${onceScheduleLabel(config)}. Won't stop recurring if it's already running.`}
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
