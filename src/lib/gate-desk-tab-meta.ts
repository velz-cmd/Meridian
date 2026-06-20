import type { GateDeskTab } from "@/components/gate/gate-desk-tabs";
import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";
import type { GateBenchmarkFull } from "@/lib/gate-route-types";
import { buildGateSkillLayers, type GateSkillLayerView } from "@/lib/gate-skill-layers";

export type GateDeskTabTier = "primary" | "secondary" | "tertiary";

export type GateDeskTabMeta = {
  id: GateDeskTab;
  label: string;
  shortLabel: string;
  /** Visual hierarchy rank — lower = more prominent */
  rank: number;
  tier: GateDeskTabTier;
  question: string;
  features: string[];
  skills: string[];
};

const TAB_DISPLAY_ORDER: GateDeskTab[] = ["overview", "memory", "technical", "rules", "replay"];

/** Tab contracts aligned with MERIDIAN visual hierarchy (Master Principles). */
const TAB_META_RAW: GateDeskTabMeta[] = [
  {
    id: "overview",
    label: "Overview",
    shortLabel: "Overview",
    rank: 1,
    tier: "primary",
    question: "What should I do on my horizon?",
    features: ["Router verdict", "Thesis", "Court", "Constitution", "Memory compact"],
    skills: ["Composite conviction"],
  },
  {
    id: "memory",
    label: "Market Memory",
    shortLabel: "Memory",
    rank: 2,
    tier: "secondary",
    question: "Have we seen this before?",
    features: ["Market Twin", "Trade DNA", "Conviction decay", "Journal", "Autopsy"],
    skills: ["Historical analog", "Memory match"],
  },
  {
    id: "technical",
    label: "Technical & reasoning",
    shortLabel: "Technical",
    rank: 2,
    tier: "secondary",
    question: "Why? Who disagrees?",
    features: ["Timeframe desk", "Bull vs Bear", "Chambers", "Skill evidence"],
    skills: ["Momentum", "Regime", "RS", "Liquidity", "Sentiment", "Volatility"],
  },
  {
    id: "rules",
    label: "Rules & spec",
    shortLabel: "Rules",
    rank: 3,
    tier: "tertiary",
    question: "What are the backtestable rules?",
    features: ["STRATEGY_SPEC", "CMC skills", "Live output", "Constitution checks"],
    skills: ["Gate checks", "Permit engine"],
  },
  {
    id: "replay",
    label: "90-day replay",
    shortLabel: "Replay",
    rank: 3,
    tier: "tertiary",
    question: "Does the spec hold historically?",
    features: ["Equity curve", "Constitution vs naive", "CLI reproduce"],
    skills: ["Backtest replay"],
  },
];

export const GATE_DESK_TAB_META: GateDeskTabMeta[] = [...TAB_META_RAW].sort(
  (a, b) => a.rank - b.rank || TAB_DISPLAY_ORDER.indexOf(a.id) - TAB_DISPLAY_ORDER.indexOf(b.id),
);

export function getGateDeskTabMeta(id: GateDeskTab): GateDeskTabMeta {
  return GATE_DESK_TAB_META.find((t) => t.id === id) ?? TAB_META_RAW[0]!;
}

export type GateTabChip = {
  label: string;
  tone: "long" | "flat" | "avoid" | "neutral";
  kind: "feature" | "skill";
};

/** Live skill highlights for a tab — LONG layers first, then by score. */
export function getTabSkillChips(tab: GateDeskTab, skills?: GateSkillsPayload | null): GateTabChip[] {
  const meta = getGateDeskTabMeta(tab);
  if (!skills || tab !== "technical") {
    return meta.skills.slice(0, 4).map((label) => ({ label, tone: "neutral", kind: "skill" as const }));
  }

  const layers = buildGateSkillLayers(skills);
  const ranked = [...layers].sort((a, b) => layerSortKey(b) - layerSortKey(a));

  return ranked.slice(0, 4).map((l) => ({
    label: shortLayerLabel(l.title),
    tone: l.stanceTone,
    kind: "skill" as const,
  }));
}

export function getTabFeatureChips(tab: GateDeskTab): GateTabChip[] {
  return getGateDeskTabMeta(tab).features.map((label) => ({
    label,
    tone: "neutral" as const,
    kind: "feature" as const,
  }));
}

export type SymbolSkillHighlight = {
  label: string;
  tone: "long" | "flat" | "avoid";
  score: number | null;
};

function layerSortKey(l: GateSkillLayerView): number {
  const pri = l.signal === "ENTER_LONG" ? 200 : l.signal === "AVOID" || l.signal === "EXIT" ? 0 : 100;
  return pri + (l.score ?? 0);
}

function shortLayerLabel(title: string): string {
  const first = title.split(" ")[0];
  if (first === "Relative") return "RS";
  if (first === "Sentiment") return "Sentiment";
  if (first === "Market") return "Regime";
  if (first === "Volatility") return "Volatility";
  if (first === "Structural") return "Structure";
  if (first === "Liquidity") return "Liquidity";
  if (first === "Trend") return "Trend";
  return first ?? title;
}

/** Top skill layers for benchmark symbol cards — ranked by signal strength. */
export function rankSymbolSkillHighlights(bench?: GateBenchmarkFull | null, limit = 3): SymbolSkillHighlight[] {
  if (!bench?.skills) return [];
  const layers = buildGateSkillLayers(bench.skills as GateSkillsPayload);
  return [...layers]
    .sort((a, b) => layerSortKey(b) - layerSortKey(a))
    .slice(0, limit)
    .map((l) => ({
      label: shortLayerLabel(l.title),
      tone: l.stanceTone,
      score: l.score,
    }));
}

/** Sort benchmark symbols by capital-router rank (1 = lead). */
export function sortSymbolsByRank<T extends string>(
  symbols: T[],
  rankBySym: Record<string, { rank: number } | undefined>,
): T[] {
  return [...symbols].sort((a, b) => (rankBySym[a]?.rank ?? 99) - (rankBySym[b]?.rank ?? 99));
}
