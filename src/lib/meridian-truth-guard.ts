/**
 * MERIDIAN Truth and Value Guard — global law enforcement helpers.
 * Cosmetic intelligence is forbidden across the entire ecosystem.
 */
import {
  MERIDIAN_TRUTH_FORBIDDEN,
  MERIDIAN_TRUTH_LAW,
  MERIDIAN_TRUTH_REQUIREMENTS,
  type MeridianDataQuality,
} from "@/lib/meridian-philosophy";

export type MeridianEcosystemModule = {
  id: string;
  label: string;
  routes: string[];
  apis: string[];
  truthRequirements: readonly string[];
};

/** Register every MERIDIAN module — present and future. */
export const MERIDIAN_ECOSYSTEM_MODULES: MeridianEcosystemModule[] = [
  {
    id: "gate",
    label: "Gate Strategy Desk",
    routes: ["/gate"],
    apis: ["/api/gate/evaluate", "/api/gate/route", "/api/gate/skills", "/api/gate/backtest", "/api/gate/pipeline"],
    truthRequirements: [
      "Live CMC quotes or explicit degraded/cache label",
      "Deterministic skills — no BUY/SELL from skill layer",
      "90-day replay from real historical bars",
      "Testnet execution disclosed with proxy routes",
    ],
  },
  {
    id: "meridian-intelligence",
    label: "Market Memory Engine",
    routes: ["/gate"],
    apis: ["/api/meridian/intelligence"],
    truthRequirements: [
      "Full provenance block with freshness and data quality",
      "Historical analogs labeled reference-only",
      "Trade journal from wallet trades or replay — never fabricated stats",
      "WAIT/UNKNOWN when evidence insufficient",
    ],
  },
  {
    id: "nexus",
    label: "NEXUS Terminal",
    routes: ["/nexus"],
    apis: [
      "/api/nexus/decide",
      "/api/nexus/conviction",
      "/api/nexus/chat",
      "/api/nexus/demo/trade",
      "/api/nexus/autopilot/cycle",
      "/api/nexus/market-pulse",
    ],
    truthRequirements: [
      "Constitution permit from real gate evaluation",
      "Thesis snapshot stored at trade entry for autopsy",
      "LLM narration only — numbers from APIs/skills",
      "Autopilot enforces discipline — not trade spam",
    ],
  },
  {
    id: "prism",
    label: "PRISM Macro Oracle",
    routes: ["/prism"],
    apis: ["/api/prism/analyze", "/api/prism/macro", "/api/prism/events", "/api/prism/predictions"],
    truthRequirements: [
      "Macro and events from real feeds",
      "Predictions labeled scenarios — not guaranteed outcomes",
      "Missing feed → unavailable state",
    ],
  },
  {
    id: "analytics",
    label: "MERIDIAN Analytics",
    routes: ["/analytics"],
    apis: ["/api/bnb/analytics", "/api/analytics/track"],
    truthRequirements: [
      "On-chain and demo trades labeled by source",
      "No fabricated win rates or PnL",
    ],
  },
  {
    id: "constitution",
    label: "Constitution Engine",
    routes: ["/nexus", "/gate"],
    apis: ["/api/constitution/permit", "/api/constitution/status"],
    truthRequirements: [
      "CMC-only data integrity — no synthetic counterfactual in permit",
      "Historical proof via /api/gate/backtest only",
    ],
  },
];

export type MeridianTruthEnvelope = {
  /** Global law identifier */
  law: typeof MERIDIAN_TRUTH_LAW;
  scope: "global";
  cosmeticIntelligenceForbidden: true;
  module: string;
  source: string;
  dataIntegrity: string;
  dataQuality?: MeridianDataQuality;
  fetchedAt: string;
  requirements: readonly string[];
};

export function resolveDataIntegrity(input: {
  cmcLive?: boolean;
  degraded?: boolean;
  source?: string;
}): string {
  if (input.cmcLive) return "cmc-live-no-synthetic";
  if (input.degraded) return "degraded-cache-or-venue";
  if (input.source) return `${input.source}-labeled`;
  return "verify-source-before-action";
}

export function buildMeridianTruthEnvelope(input: {
  moduleId: string;
  source: string;
  cmcLive?: boolean;
  degraded?: boolean;
  dataQuality?: MeridianDataQuality;
  fetchedAt?: string;
}): MeridianTruthEnvelope {
  const mod = MERIDIAN_ECOSYSTEM_MODULES.find((m) => m.id === input.moduleId);
  return {
    law: MERIDIAN_TRUTH_LAW,
    scope: "global",
    cosmeticIntelligenceForbidden: true,
    module: mod?.label ?? input.moduleId,
    source: input.source,
    dataIntegrity: resolveDataIntegrity(input),
    dataQuality: input.dataQuality,
    fetchedAt: input.fetchedAt ?? new Date().toISOString(),
    requirements: mod?.truthRequirements ?? MERIDIAN_TRUTH_REQUIREMENTS,
  };
}

/** Display helper — never show cosmetic placeholders for missing values. */
export function meridianDisplayValue(
  value: string | number | null | undefined,
  options?: { unavailableLabel?: string; prefix?: string; suffix?: string },
): string {
  const unavailable = options?.unavailableLabel ?? "DATA UNAVAILABLE";
  if (value == null || value === "" || (typeof value === "number" && Number.isNaN(value))) {
    return unavailable;
  }
  const core = typeof value === "number" ? String(value) : value;
  return `${options?.prefix ?? ""}${core}${options?.suffix ?? ""}`;
}

export function meridianTruthPreamble(): string {
  return [
    MERIDIAN_TRUTH_LAW,
    "",
    "Forbidden:",
    ...MERIDIAN_TRUTH_FORBIDDEN.map((f) => `- ${f}`),
    "",
    "Required:",
    ...MERIDIAN_TRUTH_REQUIREMENTS.map((r) => `- ${r}`),
  ].join("\n");
}

export function getEcosystemModule(moduleId: string): MeridianEcosystemModule | undefined {
  return MERIDIAN_ECOSYSTEM_MODULES.find((m) => m.id === moduleId);
}
