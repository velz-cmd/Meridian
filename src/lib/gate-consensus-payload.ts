/** Shape of composite.judgeConsensus from meridian-skills.mjs */

export type GateConsensusLayer = {
  id: string;
  name: string;
  signal: string;
  weight: number;
  agreesWithDesk?: boolean;
};

export type GateJudgeConsensus = {
  schema: string;
  symbol: string;
  deskSignal: string;
  deskPosition: "LONG" | "FLAT";
  constitutionSignal: string;
  constitutionTier?: string;
  constitutionChecks?: string;
  cleared: boolean;
  permit: { status: "GRANT" | "DENY"; execute: "LONG" | "FLAT"; reason: string };
  alignmentScore: number;
  weights: { longPct: number; holdPct: number; bearPct: number };
  votes: { long: number; hold: number; bear: number; total: number };
  coreStack: { ids: string[]; long: number; required: number; passed: boolean };
  longLayerPass: boolean;
  rules: Record<string, unknown>;
  layers: GateConsensusLayer[];
  blockers: string[];
  constitutionOnly: boolean;
  method: string;
};

/** Extract judge consensus from skills composite (engine-native). */
export function extractJudgeConsensus(skills: {
  composite?: { judgeConsensus?: GateJudgeConsensus | Record<string, unknown> } & Record<string, unknown>;
} | null | undefined): GateJudgeConsensus | null {
  const block = skills?.composite?.judgeConsensus;
  if (!block || typeof block !== "object") return null;
  return block as GateJudgeConsensus;
}
