/**
 * Normalized skill evidence — skills are calculators, not trade bots.
 * Skills output score + evidence + confidence; Constitution decides.
 */

export type MeridianSkillEvidence = {
  skill: string;
  score: number;
  confidence: number;
  evidence: string[];
  explanation: string;
  /** Evidence stance — not a trade command. Constitution makes decisions. */
  stance: string;
  dataSource: string;
  dataUnavailable: boolean;
};

type RawSkill = {
  id?: string;
  name?: string;
  signal?: string;
  confidence?: number;
  thesis?: string;
  entryRule?: string;
  dataSource?: string;
  dataUnavailable?: boolean;
  checks?: Array<{ id?: string; label?: string; pass?: boolean }>;
  checksPassed?: number;
  checksTotal?: number;
  metrics?: Record<string, string | number | boolean | null>;
  socialHeat?: number;
  flowScore?: number;
  state?: string;
};

function metricEvidence(metrics: RawSkill["metrics"]): string[] {
  if (!metrics) return [];
  return Object.entries(metrics)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k} = ${v}`);
}

function checkEvidence(checks: RawSkill["checks"]): string[] {
  if (!checks?.length) return [];
  return checks.map((c) => {
    const mark = c.pass ? "✓" : "✗";
    return `${mark} ${c.label ?? c.id ?? "check"}`;
  });
}

function computeScore(skill: RawSkill): number {
  if (skill.dataUnavailable || skill.dataSource === "pending") return 0;
  if (skill.checksTotal && skill.checksPassed != null) {
    return Math.round((skill.checksPassed / skill.checksTotal) * 100);
  }
  if (skill.confidence != null) return Math.round(skill.confidence);
  if (skill.socialHeat != null && skill.flowScore != null) {
    return Math.round((skill.socialHeat + skill.flowScore) / 2);
  }
  return 0;
}

function computeConfidence(skill: RawSkill): number {
  if (skill.dataUnavailable || skill.dataSource === "pending") return 0;
  if (skill.checksTotal && skill.checksPassed != null) {
    return Math.round((skill.checksPassed / skill.checksTotal) * 100) / 100;
  }
  if (skill.confidence != null) return Math.round(skill.confidence) / 100;
  return 0.7;
}

/** Convert engine skill output to evidence format (no BUY/SELL). */
export function toSkillEvidence(skill: RawSkill): MeridianSkillEvidence {
  const evidence = [...checkEvidence(skill.checks), ...metricEvidence(skill.metrics)];
  if (skill.state) evidence.push(`state: ${skill.state}`);
  if (skill.socialHeat != null) evidence.push(`socialHeat = ${skill.socialHeat}`);
  if (skill.flowScore != null) evidence.push(`flowScore = ${skill.flowScore}`);

  return {
    skill: skill.name ?? skill.id ?? "Unknown",
    score: computeScore(skill),
    confidence: computeConfidence(skill),
    evidence,
    explanation: skill.thesis ?? skill.entryRule ?? "No explanation recorded.",
    stance: skill.signal ?? "HOLD",
    dataSource: skill.dataSource ?? "unknown",
    dataUnavailable: Boolean(skill.dataUnavailable || skill.dataSource === "pending"),
  };
}

const SKILL_KEYS = [
  "momentum",
  "sentiment",
  "regime",
  "trend",
  "liquidity",
  "structural",
  "relativeStrength",
  "volatility",
] as const;

/** Extract evidence bundle from composeSkillVerdict output. */
export function extractSkillEvidenceBundle(skills: Record<string, unknown> | null | undefined): MeridianSkillEvidence[] {
  if (!skills) return [];
  return SKILL_KEYS.map((key) => {
    const raw = skills[key] as RawSkill | undefined;
    return raw ? toSkillEvidence(raw) : null;
  }).filter((e): e is MeridianSkillEvidence => e != null);
}

export function countDataCompleteness(evidence: MeridianSkillEvidence[]): number {
  if (!evidence.length) return 0;
  const available = evidence.filter((e) => !e.dataUnavailable).length;
  return Math.round((available / evidence.length) * 100);
}
