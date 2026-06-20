/** CMC Strategy Skill metadata — shared by permit API + status endpoint */
export const CONSTITUTION_SKILL = {
  id: "nexus-momentum-gate",
  version: "1.1.0",
  specVersion: "1.1.0",
  outputSchema: "nexus-momentum-gate/v1",
  permitSchema: "meridian-constitution-permit/v1",
  specPath: "bnb-hack/skills/nexus-momentum-gate/STRATEGY_SPEC.md",
  specUrl:
    "https://github.com/ibrahim0-cursor/cursor-arc-circle/blob/main/bnb-hack/skills/nexus-momentum-gate/STRATEGY_SPEC.md",
  skillPath: "bnb-hack/skills/nexus-momentum-gate/SKILL.md",
  hubTrack: "MERIDIAN Strategy Skill",
  /** Stable fingerprint for judges — spec version + skill id */
  specHash: "nmg-v1.1.0-7f3a",
} as const;

export type ConstitutionSkillMeta = typeof CONSTITUTION_SKILL;
