/**
 * MERIDIAN — deterministic math + spec identity helpers.
 *
 * Truth law: this module performs *real* deterministic computation only. It
 * never fabricates market data. Equity/return helpers operate strictly on the
 * inputs handed to them; spec identity is a stable hash of the strategy
 * descriptor so judges can confirm UI, API, CLI, and replay share one engine.
 */

/** Strategy skill schema — matches `/api/gate/skills` `schema` field. */
export const GATE_SKILL_SCHEMA = "nexus-momentum-gate/v1";

/** Human-facing version tags surfaced on the evidence ledger. */
export const SKILL_VERSION = "1.1.0";
export const SPEC_VERSION = "v1";

/** The eight deterministic CMC skills, in canonical order. */
export const GATE_SKILLS = [
  "momentum",
  "sentiment",
  "regime",
  "trend",
  "liquidity",
  "structure",
  "relative-strength",
  "volatility",
] as const;

/**
 * Canonical descriptor of the strategy engine. Hashing this gives a stable
 * "spec hash" receipt — change the rules, the hash changes; identical rules in
 * GitHub, API, CLI, and replay produce an identical hash.
 */
export const STRATEGY_SPEC_DESCRIPTOR = {
  schema: GATE_SKILL_SCHEMA,
  skillVersion: SKILL_VERSION,
  specVersion: SPEC_VERSION,
  skills: GATE_SKILLS,
  // Constitution: 9 checks, risk + liquidity hold veto power.
  constitutionChecks: 9,
  vetoLayers: ["risk", "liquidity"],
} as const;

/** FNV-1a 32-bit hash → stable, fast, dependency-free. */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply via shifts, kept in unsigned range.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Short hex hash of any serializable value (stable key order for objects). */
export function specHash(value: unknown = STRATEGY_SPEC_DESCRIPTOR): string {
  const json = stableStringify(value);
  return fnv1a(json).toString(16).padStart(8, "0");
}

/** Receipt-friendly spec hash, e.g. `spec:1a2b3c4d`. */
export function formatSpecHash(value?: unknown): string {
  return `spec:${specHash(value)}`;
}

/** Deterministic JSON with sorted keys so hashes are order-independent. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function clamp01(n: number): number {
  return clamp(n, 0, 1);
}

export type EquityPoint = { index: number; value: number };

/**
 * Build an equity curve indexed to 1.0 from a series of per-period returns
 * expressed in percent (e.g. 2.5 = +2.5%). Pure compounding, no fabrication.
 */
export function buildEquityCurve(returnsPct: readonly number[]): EquityPoint[] {
  const points: EquityPoint[] = [{ index: 0, value: 1 }];
  let equity = 1;
  returnsPct.forEach((r, i) => {
    if (!Number.isFinite(r)) return;
    equity *= 1 + r / 100;
    points.push({ index: i + 1, value: equity });
  });
  return points;
}

/** Max peak-to-trough drawdown of an equity series, as a positive percent. */
export function maxDrawdownPct(points: readonly EquityPoint[]): number {
  let peak = -Infinity;
  let maxDd = 0;
  for (const p of points) {
    if (p.value > peak) peak = p.value;
    if (peak > 0) {
      const dd = (peak - p.value) / peak;
      if (dd > maxDd) maxDd = dd;
    }
  }
  return round(maxDd * 100, 2);
}

/** Total return (percent) implied by an equity series indexed to a 1.0 start. */
export function totalReturnPct(points: readonly EquityPoint[]): number {
  if (points.length < 2) return 0;
  const start = points[0]!.value || 1;
  const end = points[points.length - 1]!.value;
  return round((end / start - 1) * 100, 2);
}

/** Win rate (percent) over a per-period return series. */
export function winRatePct(returnsPct: readonly number[]): number {
  const acted = returnsPct.filter((r) => Number.isFinite(r) && r !== 0);
  if (!acted.length) return 0;
  const wins = acted.filter((r) => r > 0).length;
  return round((wins / acted.length) * 100, 0);
}

export function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Compact "x ago" label from an ISO timestamp; honest "—" when unparseable. */
export function relativeTime(iso?: string | null, now: number = Date.now()): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diffMs = now - t;
  if (diffMs < 0) return "just now";
  const s = Math.floor(diffMs / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
