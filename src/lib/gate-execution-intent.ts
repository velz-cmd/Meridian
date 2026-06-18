import type { PositionDirection } from "@/lib/position-router";

export type GateDeskAction = "buy" | "sell" | "agent";

export type GateExecutionIntent = {
  symbol: string;
  direction: PositionDirection;
  leverage: number;
  action?: GateDeskAction;
  permit?: "GRANT" | "DENY";
  permitId?: string;
  autoStart?: boolean;
  confidence?: number;
  suggestedTbnb?: number;
  at: string;
};

export const GATE_INTENT_STORAGE_KEY = "meridian-gate-intent";

export function clampGateLeverage(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/** Spot thesis size — not perp margin. Caps at 40% wallet per click. */
export function computeGateSpendTbnb(
  walletTbnb: number,
  leverage: number,
  confidence: number,
  direction: PositionDirection,
): number {
  if (direction === "FLAT" || walletTbnb <= 0) return 0;
  const base = Math.min(walletTbnb * 0.4, Math.max(0.005, walletTbnb * 0.1));
  const lev = clampGateLeverage(leverage);
  const conf = Math.min(1, Math.max(0.35, confidence / 100));
  return Math.max(0.001, Number((base * lev * conf).toFixed(6)));
}

export function saveGateExecutionIntent(intent: Omit<GateExecutionIntent, "at">): GateExecutionIntent {
  const full: GateExecutionIntent = { ...intent, at: new Date().toISOString() };
  try {
    sessionStorage.setItem(GATE_INTENT_STORAGE_KEY, JSON.stringify(full));
  } catch {
    /* private mode */
  }
  return full;
}

export function loadGateExecutionIntent(): GateExecutionIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(GATE_INTENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GateExecutionIntent;
    if (!parsed?.symbol) return null;
    return {
      ...parsed,
      leverage: clampGateLeverage(parsed.leverage ?? 1),
      direction: parsed.direction ?? "FLAT",
    };
  } catch {
    return null;
  }
}

export function clearGateExecutionIntent(): void {
  try {
    sessionStorage.removeItem(GATE_INTENT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function parseGateDirection(raw: string | null): PositionDirection | undefined {
  const u = raw?.toUpperCase();
  if (u === "LONG" || u === "SHORT" || u === "FLAT") return u;
  return undefined;
}

export function parseGateAction(raw: string | null): GateDeskAction | undefined {
  const a = raw?.toLowerCase();
  if (a === "buy" || a === "sell" || a === "agent") return a;
  return undefined;
}
