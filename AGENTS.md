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
