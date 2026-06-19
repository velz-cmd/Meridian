// ── Types ────────────────────────────────────────────────────────────────────

export type AutopilotInterval =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "4h"
  | "12h"
  | "1d"
  | "1w"
  | "custom";

export type AutopilotAmountMode = "percent" | "custom_usdc" | "custom_token";

export type AutopilotVenue = "spot" | "futures";

export type AutopilotPolicyMode =
  | "data_desk"
  | "follow_agent"
  | "follow_direction"
  | "buy_only"
  | "sell_only";

export type AutopilotScheduleMode = "recurring" | "once";

/** When desk signal is HOLD/WATCH — user decides whether to still trade */
export type AutopilotHoldAction = "skip" | "buy" | "sell";

/** One-time: run immediately or after the configured interval */
export type AutopilotOnceRunWhen = "now" | "scheduled";

export type AutopilotConfig = {
  /** Recurring agent loop — independent from one-time runs */
  recurringEnabled: boolean;
  /** UI tab: configure recurring vs one-time (does not stop the other) */
  scheduleMode: AutopilotScheduleMode;
  onceRunWhen: AutopilotOnceRunWhen;
  interval: AutopilotInterval;
  customIntervalMinutes: string;
  percent: number;
  amountMode: AutopilotAmountMode;
  customUsdc: string;
  customToken: string;
  customTokenAddress: string;
  customTokenSymbol: string;
  customTokenChain: string;
  customAmountUnit: "tokens" | "usdc";
  mode: AutopilotPolicyMode;
  /** Spot = Chapel swaps; futures = signal desk only (funding/OI, no Chapel perp) */
  venue: AutopilotVenue;
  /** Spot thesis size multiplier (1–5×) — scales buy size from wallet %, not perp margin */
  spotThesisLeverage: number;
  /** Futures perp leverage hint for external venue (1–20×) */
  futuresLeverage: number;
  /** Futures margin allocation (% of notional budget per signal) */
  marginPercent: number;
  /** Stop recurring after N executed trades; 0 = unlimited, -1 = customMaxTrades */
  maxTrades: number;
  customMaxTrades: string;
  /** If AI says HOLD — skip, or user override to buy/sell anyway */
  holdAction: AutopilotHoldAction;
  tokenKey?: string;
};

export type AutopilotLog = {
  at: string;
  message: string;
  type: "info" | "trade" | "error";
};

// ── Constants ────────────────────────────────────────────────────────────────

export const AUTOPILOT_INTERVALS: Record<
  Exclude<AutopilotInterval, "custom">,
  { label: string; ms: number }
> = {
  "1m": { label: "1 min", ms: 60_000 },
  "5m": { label: "5 min", ms: 5 * 60_000 },
  "15m": { label: "15 min", ms: 15 * 60_000 },
  "30m": { label: "30 min", ms: 30 * 60_000 },
  "1h": { label: "1 hour", ms: 60 * 60_000 },
  "4h": { label: "4 hours", ms: 4 * 60 * 60_000 },
  "12h": { label: "12 hours", ms: 12 * 60 * 60_000 },
  "1d": { label: "1 day", ms: 24 * 60 * 60_000 },
  "1w": { label: "1 week", ms: 7 * 24 * 60 * 60_000 },
};

const STORAGE_KEY = "nexus-autopilot-v2";

// ── Persistence ──────────────────────────────────────────────────────────────

export function defaultAutopilot(): AutopilotConfig {
  return {
    recurringEnabled: false,
    scheduleMode: "recurring",
    onceRunWhen: "now",
    interval: "15m",
    customIntervalMinutes: "60",
    percent: 25,
    amountMode: "percent",
    customUsdc: "0.01",
    customToken: "",
    customTokenAddress: "",
    customTokenSymbol: "",
    customTokenChain: "base",
    customAmountUnit: "tokens",
    mode: "data_desk",
    venue: "spot",
    spotThesisLeverage: 1,
    futuresLeverage: 3,
    marginPercent: 25,
    maxTrades: 0,
    customMaxTrades: "10",
    holdAction: "skip",
  };
}

export function loadAutopilot(): AutopilotConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("nexus-autopilot-v1");
    if (!raw) return defaultAutopilot();
    const parsed = JSON.parse(raw) as AutopilotConfig & { enabled?: boolean };
    const merged = { ...defaultAutopilot(), ...parsed } as AutopilotConfig;
    if (typeof parsed.enabled === "boolean" && parsed.recurringEnabled === undefined) {
      merged.recurringEnabled = parsed.enabled;
    }
    if (!merged.scheduleMode) merged.scheduleMode = "recurring";
    if (!merged.onceRunWhen) merged.onceRunWhen = "now";
    merged.mode = merged.mode ?? "data_desk";
    if (!merged.venue) merged.venue = "spot";
    if (merged.spotThesisLeverage == null) merged.spotThesisLeverage = 1;
    if (merged.futuresLeverage == null) merged.futuresLeverage = 3;
    if (merged.marginPercent == null) merged.marginPercent = 25;
    if (merged.maxTrades == null) merged.maxTrades = 0;
    if (!merged.customMaxTrades) merged.customMaxTrades = "10";
    if (!merged.holdAction) merged.holdAction = "skip";
    return merged;
  } catch {
    return defaultAutopilot();
  }
}

export function saveAutopilot(config: AutopilotConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function tokenKey(chainId: string, address: string) {
  return `${chainId}:${address.toLowerCase()}`;
}

// ── Schedule & timing ────────────────────────────────────────────────────────

export function autopilotIntervalMs(config: AutopilotConfig): number {
  if (config.interval === "custom") {
    const minutes = Math.max(1, Math.min(10_080, Number(config.customIntervalMinutes) || 60));
    return minutes * 60_000;
  }
  return AUTOPILOT_INTERVALS[config.interval].ms;
}

/** Delay before a one-time trade when onceRunWhen is scheduled */
export function autopilotOnceDelayMs(config: AutopilotConfig): number {
  if (config.onceRunWhen === "now") return 0;
  return autopilotIntervalMs(config);
}

export function onceScheduleLabel(cfg: AutopilotConfig): string {
  if (cfg.onceRunWhen === "now") return "immediately";
  if (cfg.interval === "custom") return `after ${cfg.customIntervalMinutes || "60"} min`;
  return `after ${AUTOPILOT_INTERVALS[cfg.interval as Exclude<AutopilotInterval, "custom">]?.label ?? cfg.interval}`;
}

// ── Leverage & trade limits ──────────────────────────────────────────────────

export function clampSpotThesisLeverage(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n)));
}

export function clampFuturesLeverage(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(20, Math.max(1, Math.round(n)));
}

export function effectiveMaxTrades(cfg: AutopilotConfig): number {
  if (cfg.maxTrades === -1) {
    return Math.max(1, Math.min(100, Number(cfg.customMaxTrades) || 10));
  }
  return Math.max(0, cfg.maxTrades);
}

export function maxTradesLabel(cfg: AutopilotConfig): string {
  const n = effectiveMaxTrades(cfg);
  if (n <= 0) return "unlimited";
  return String(n);
}

export function autopilotScheduleSummary(cfg: AutopilotConfig): string {
  const interval =
    cfg.interval === "custom"
      ? `${cfg.customIntervalMinutes || "60"} min`
      : AUTOPILOT_INTERVALS[cfg.interval as Exclude<AutopilotInterval, "custom">]?.label ??
        cfg.interval;
  const capN = effectiveMaxTrades(cfg);
  const cap =
    capN <= 0 ? "until you stop" : `up to ${capN} trade${capN === 1 ? "" : "s"}`;
  if (cfg.scheduleMode === "once") {
    return `One trade ${onceScheduleLabel(cfg)}`;
  }
  return `Every ${interval} · ${cap}`;
}

// ── Wallet funding estimates ─────────────────────────────────────────────────

/** Minimum wallet balance (USD notional) before starting autopilot buys */
export function estimateRequiredUsdc(
  config: AutopilotConfig,
  balanceUsd: number,
  bnbSpotUsd = 600,
): number {
  const arcBufferUsd = 0.05 * bnbSpotUsd;
  if (config.amountMode === "custom_usdc") {
    const tbnb = Math.max(0, Number(config.customUsdc) || 0);
    return Math.max(0.05 * bnbSpotUsd, tbnb * bnbSpotUsd) + arcBufferUsd;
  }
  if (config.amountMode === "custom_token" && config.customAmountUnit === "usdc") {
    const tbnb = Math.max(0, Number(config.customToken) || 0);
    return Math.max(0.05 * bnbSpotUsd, tbnb * bnbSpotUsd) + arcBufferUsd;
  }
  if (config.amountMode === "percent") {
    return Math.max(0.05 * bnbSpotUsd, (balanceUsd * config.percent) / 100) + arcBufferUsd;
  }
  return 0.055 * bnbSpotUsd;
}

/** Minimum wallet balance (USD notional) before autopilot buys on BSC Testnet tBNB */
export function minVaultUsdcForAutopilot(
  config: AutopilotConfig,
  balanceUsd: number,
  bnbSpotUsd = 600,
): number {
  if (config.mode === "sell_only") return 0;
  return estimateRequiredUsdc(config, balanceUsd, bnbSpotUsd);
}
