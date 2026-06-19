import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";

type GateLike = { signal: string; confidence?: number | null };

/** Single desk signal — composite when skills ran, else raw constitution. */
export function effectiveGateSignal(gate: GateLike, skills?: GateSkillsPayload | null): string {
  return skills?.composite?.signal ?? gate.signal;
}

export function effectivePosition(gate: GateLike, skills?: GateSkillsPayload | null): "LONG" | "FLAT" {
  return effectiveGateSignal(gate, skills) === "ENTER_LONG" ? "LONG" : "FLAT";
}

export function effectiveCleared(gate: GateLike, skills?: GateSkillsPayload | null): boolean {
  if (skills?.composite?.permit?.status) return skills.composite.permit.status === "GRANT";
  if (skills?.composite) return skills.composite.cleared;
  return gate.signal === "ENTER_LONG";
}

/** Honest confidence — composite alignment when skills present, else gate confidence. */
export function effectiveConfidence(gate: GateLike, skills?: GateSkillsPayload | null): number {
  if (skills?.composite?.alignmentScore != null) return skills.composite.alignmentScore;
  return gate.confidence ?? 50;
}

export function constitutionOverridden(gate: GateLike, skills?: GateSkillsPayload | null): boolean {
  return Boolean(skills?.composite?.constitutionOnly);
}
