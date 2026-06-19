import type { GateBenchmarkFull, GateRoutePayload } from "@/lib/gate-route-types";
import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";

export type GateSignalRow = {
  name: string;
  value: number;
  max: number;
  direction: string;
  bull: boolean;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(Math.max(n, lo), hi);
}

function macdScore(signal?: string): { value: number; direction: string; bull: boolean } {
  const s = (signal ?? "neutral").toLowerCase();
  if (s === "bullish") return { value: 72, direction: "BULLISH", bull: true };
  if (s === "bearish") return { value: 28, direction: "BEARISH", bull: false };
  return { value: 50, direction: "NEUTRAL", bull: false };
}

function fngDirection(val: number): { direction: string; bull: boolean } {
  if (val > 75) return { direction: "GREED", bull: false };
  if (val > 55) return { direction: "GREED", bull: true };
  if (val < 25) return { direction: "FEAR", bull: false };
  if (val < 40) return { direction: "FEAR", bull: true };
  return { direction: "NEUTRAL", bull: true };
}

function rsiDirection(rsi: number): { direction: string; bull: boolean } {
  if (rsi > 72) return { direction: "OVERBOUGHT", bull: false };
  if (rsi < 35) return { direction: "OVERSOLD", bull: false };
  return { direction: "IN RANGE", bull: true };
}

/** Live composite bars — derived from CMC + gate checks, not LLM output. */
export function buildGateSignalMeter(
  selected: GateBenchmarkFull,
  route: GateRoutePayload | null,
  skills: GateSkillsPayload | null | undefined,
): GateSignalRow[] {
  const m = selected.market;
  const checks = selected.gate.checks ?? [];
  const passedWeight = checks.filter((c) => c.pass).reduce((s, c) => s + c.weight, 0);
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const agreementPct = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

  const fng = route?.fearGreed ?? m.fearGreed ?? skills?.momentum.metrics?.fearGreed ?? 50;
  const fngMeta = fngDirection(fng);

  const rsi = m.rsi ?? skills?.momentum.metrics?.rsi ?? 50;
  const rsiMeta = rsiDirection(rsi);

  const macd = macdScore(m.macdSignal ?? skills?.momentum.metrics?.macd);

  const ch24 = m.change24h;
  const momVal = clamp(Math.abs(ch24) * 6, 0, 100);
  const momBull = ch24 > 0 && ch24 < 15;

  const momentumPct =
    skills?.momentum.checksTotal
      ? Math.round((skills.momentum.checksPassed / skills.momentum.checksTotal) * 100)
      : agreementPct;

  const alignment = skills?.composite.alignmentScore ?? agreementPct;

  const rs24 = skills?.relativeStrength?.metrics?.rs24h ?? 0;
  const rsScore = clamp(50 + rs24 * 2.2, 0, 100);
  const volState = skills?.volatility?.state ?? "unknown";
  const volScore =
    volState === "squeeze"
      ? 72
      : volState === "expansion"
        ? 28
        : volState === "neutral"
          ? 52
          : 50;

  return [
    {
      name: "Fear & Greed",
      value: Math.round(fng),
      max: 100,
      direction: fngMeta.direction,
      bull: fngMeta.bull,
    },
    {
      name: "RSI (14)",
      value: Math.round(rsi),
      max: 100,
      direction: rsiMeta.direction,
      bull: rsiMeta.bull,
    },
    {
      name: "MACD",
      value: macd.value,
      max: 100,
      direction: macd.direction,
      bull: macd.bull,
    },
    {
      name: "24h momentum",
      value: Math.round(momVal),
      max: 100,
      direction: ch24 >= 0 ? "BULLISH" : "BEARISH",
      bull: momBull,
    },
    {
      name: "Rule agreement",
      value: agreementPct,
      max: 100,
      direction: agreementPct >= 60 ? "ALIGNED" : agreementPct >= 45 ? "MIXED" : "WEAK",
      bull: agreementPct >= 50,
    },
    {
      name: "Skill alignment",
      value: alignment,
      max: 100,
      direction: alignment >= 65 ? "CLEAR" : alignment >= 45 ? "PARTIAL" : "BLOCKED",
      bull: alignment >= 55,
    },
    {
      name: "Momentum layer",
      value: momentumPct,
      max: 100,
      direction: (skills?.momentum.signal ?? selected.gate.signal).replace(/_/g, " "),
      bull: skills?.momentum.signal === "ENTER_LONG",
    },
    {
      name: "RS vs BNB",
      value: Math.round(rsScore),
      max: 100,
      direction: `${(skills?.relativeStrength?.role ?? "inline").toUpperCase()} · ${rs24 >= 0 ? "+" : ""}${rs24.toFixed(1)}%`,
      bull: (skills?.relativeStrength?.signal ?? "HOLD") === "ENTER_LONG",
    },
    {
      name: "Vol regime",
      value: volScore,
      max: 100,
      direction: volState.toUpperCase(),
      bull: volState === "squeeze" || (skills?.volatility?.signal === "ENTER_LONG"),
    },
  ];
}

export function gateVerdictFromSignal(signal: string): {
  label: "LONG" | "FLAT" | "EXIT" | "AVOID";
  reason: string;
} {
  switch (signal) {
    case "ENTER_LONG":
      return { label: "LONG", reason: "Constitution tier cleared — entry rules pass on this bar." };
    case "EXIT":
      return { label: "EXIT", reason: "Exit rules triggered — de-risk to flat." };
    case "AVOID":
      return { label: "AVOID", reason: "Safety or macro filters block entry — stay flat." };
    default:
      return { label: "FLAT", reason: "Default flat — insufficient agreement for A/A+ tier entry." };
  }
}
