<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:meridian-evidence-rules -->
# MERIDIAN — Evidence Engine (not oracle)

MERIDIAN is a **market intelligence operating system**, not an AI predictor.

- **CMC APIs** provide raw data only.
- **Skills** are deterministic calculators — they output score, evidence, confidence, explanation. Skills never output BUY/SELL.
- **Bull Court / Bear Court** show disagreement — never force agreement.
- **Constitution Engine** makes final GRANT / DENY / WAIT / UNKNOWN judgments. Risk and liquidity have veto power.
- **Memory layer** (Market Twin, Historical Analog) provides references — not predictions.
- **LLM sits near the end** for narration only — never at the beginning for numbers.

Golden rules: never hallucinate, never fabricate missing data, cite sources, prefer WAIT over fake certainty.

Full rules: `src/lib/meridian-philosophy.ts` · API: `/api/meridian/intelligence`
<!-- END:meridian-evidence-rules -->

<!-- BEGIN:meridian-design-v2 -->
# MERIDIAN Gate UI — Design System V2

When editing `/gate`, `src/components/gate/**`, or MERIDIAN desk surfaces:

1. Read **`docs/MERIDIAN-DESIGN-V2.md`** first.
2. **Never delete** skills, cards, metrics, tabs, or APIs — reorganize with progressive disclosure only.
3. **One question per card.** Default = executive summary (score + stance + reason). Expand = full metrics.
4. Use **`GateSkillLayerCard`** + **`buildGateSkillLayers()`** for skill UI — not dense metric grids in collapsed state.
5. **Overview tab** = verdict, thesis, constitution, narrative, live CMC strip, one execution CTA — no indicator walls.
6. **Data honesty:** live CMC labels, symbol-scoped intelligence, DATA UNAVAILABLE when missing, testnet execution disclosed.
7. Typography: hero `text-4xl`, calm borders `white/[0.08]`, minimal mono — see design doc tokens.
<!-- END:meridian-design-v2 -->
