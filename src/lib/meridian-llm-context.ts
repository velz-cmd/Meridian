/**
 * LLM context blocks — MERIDIAN sits near the end, never at the beginning.
 * Inject into NEXUS chat/decide prompts only; Gate path stays deterministic.
 */
import {
  MERIDIAN_CORE_PHILOSOPHY,
  MERIDIAN_GOLDEN_RULES,
  MERIDIAN_LLM_GUARDRAILS,
} from "@/lib/meridian-philosophy";

export function meridianLlmSystemPreamble(): string {
  return [
    "MERIDIAN EVIDENCE RULES (mandatory):",
    MERIDIAN_CORE_PHILOSOPHY.tagline,
    `- ${MERIDIAN_CORE_PHILOSOPHY.abstention}`,
    `- ${MERIDIAN_CORE_PHILOSOPHY.confidenceModel}`,
    `- ${MERIDIAN_CORE_PHILOSOPHY.llmPlacement}`,
    "",
    "Guardrails:",
    ...MERIDIAN_LLM_GUARDRAILS.map((g) => `- ${g}`),
  ].join("\n");
}

export function meridianGoldenRulesBlock(): string {
  return MERIDIAN_GOLDEN_RULES.map((r, i) => `${i + 1}. ${r}`).join("\n");
}
