<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:meridian-truth-law -->
# MERIDIAN Truth and Value — GLOBAL LAW (all modules)

**Read first:** `docs/MERIDIAN-TRUTH-AND-VALUE.md` · `src/lib/meridian-truth-guard.ts`

This law applies to **every** present and future MERIDIAN module — Gate, NEXUS, PRISM, Analytics, agents, APIs, charts, skills, and UI. Not Gate-only.

**Forbidden everywhere:** cosmetic intelligence · fake intelligence · fabricated confidence · artificial complexity · placeholder reasoning · pretending certainty.

**Required everywhere:** real data (sourced + timestamped) · real reasoning (skills/deterministic logic) · real accountability · honest DATA UNAVAILABLE · evidence-derived confidence · LLM narration only for numbers.

New modules must register in `MERIDIAN_ECOSYSTEM_MODULES`. New intelligence APIs must include `meridianTruth` envelope.

<!-- END:meridian-truth-law -->

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

<!-- BEGIN:meridian-master-principles -->
# MERIDIAN Master Principles — canonical standard

Before any MERIDIAN product, UI, or intelligence change, read **`docs/MERIDIAN-MASTER-PRINCIPLES.md`** and **`docs/MERIDIAN-TRUTH-AND-VALUE.md`**.

- **Trust is the ultimate product** — optimize architecture over 1,000 trades, not the next trade.
- **Do not delete** — never remove features, skills, cards, or APIs; reorganize with progressive disclosure.
- **Design:** powerful underneath, calm on surface; one question per card; verdict/thesis primary, metrics tertiary.
- **Engineering:** world-class polish — alignment, consistency, performance without sacrificing capability.
- **Data:** never fabricate; truth over confidence; WAIT/UNKNOWN valid.
- **Originality:** learn from Apple, Bloomberg, Linear, Stripe, etc. — apply principles, build uniquely MERIDIAN.

Full constants: `src/lib/meridian-philosophy.ts` (`MERIDIAN_MASTER_PRINCIPLES`)
<!-- END:meridian-master-principles -->

<!-- BEGIN:meridian-design-v2 -->
# MERIDIAN Gate UI — Design System V2

When editing `/gate`, `src/components/gate/**`, or MERIDIAN desk surfaces:

1. Read **`docs/MERIDIAN-MASTER-PRINCIPLES.md`** and **`docs/MERIDIAN-DESIGN-V2.md`** first.
2. **Never delete** skills, cards, metrics, tabs, or APIs — reorganize with progressive disclosure only.
3. **One question per card.** Default = executive summary (score + stance + reason). Expand = full metrics.
4. Use **`GateSkillLayerCard`** + **`buildGateSkillLayers()`** for skill UI — not dense metric grids in collapsed state.
5. **Overview tab** = router verdict (ONE TRUTH), thesis, court, constitution, narrative, memory compact, primary action — no skill dump, no conflicting headlines.
6. **Data honesty:** live CMC labels, symbol-scoped intelligence, DATA UNAVAILABLE when missing, testnet execution disclosed.
7. Typography: hero `text-4xl`, calm borders `white/[0.08]`, minimal mono — see design doc tokens.
<!-- END:meridian-design-v2 -->

<!-- BEGIN:meridian-north-star -->
# MERIDIAN North Star — trust is the product

When editing intelligence, copy, LLM prompts, or Gate accountability surfaces:

1. Read **`docs/MERIDIAN-NORTH-STAR.md`** and **`src/lib/meridian-philosophy.ts`** first.
2. **Optimize for trust over 1,000 trades** — not excitement on the next trade.
3. **Never promise high accuracy** — show bull-bear spread, data quality, losses, and drawdowns.
4. **WAIT and UNKNOWN are valid** — no trade beats a bad trade; reduce frequency, increase selectivity.
5. **Accountability is mandatory** — trade journal + autopsy on Memory tab; never hide failures.
6. **Daily value loop:** morning brief / court / twin → intraday updates → post-trade autopsy & stats.
<!-- END:meridian-north-star -->

<!-- BEGIN:meridian-decision-engine -->
# MERIDIAN Decision Engine — evidence synthesis, not prediction

**Read first:** `docs/MERIDIAN-DECISION-ENGINE.md` · `src/lib/meridian-direction-engine.ts`

- MERIDIAN **synthesizes evidence** — it does not predict. LONG / SHORT / FLAT are consequences, not defaults.
- **Directional neutrality** — no preferred direction; adapt continuously to live conditions.
- Publish **long · short · hold · conflict · uncertainty · data quality** scores — never "7/9 = LONG".
- **Nine layers:** regime, trend, momentum, liquidity, RS, structure, narrative, memory, court.
- **Multi-timeframe:** 3m–1w roadmap; higher TF anchors; micro cannot override swing without consensus.
- **Risk has veto power** — opportunity never overrides regime, liquidity, or extreme uncertainty.
- **Overview ONE TRUTH** = position router verdict; decision scores explain on Technical tab only.
- **WAIT / UNKNOWN / FLAT** are valid. Trade quality > trade frequency.
<!-- END:meridian-decision-engine -->

<!-- BEGIN:meridian-track2-priority -->
# MERIDIAN Track 2 Priority Mode

When `NEXT_PUBLIC_MERIDIAN_TRACK2_PRIORITY=1`:

- Gate = CMC Strategy Skill product surface; execution is secondary (progressive disclosure only).
- Overview = position router ONE TRUTH; sub-tabs explain — never compete.
- Multi-TF desk shows honest live/planned/DATA UNAVAILABLE labels until bars exist.
- Wallets carry intelligence; they never own it.

Full roadmap: `docs/MERIDIAN-ROADMAP-2026.md` · constants: `src/lib/meridian-track2-mode.ts`
<!-- END:meridian-track2-priority -->

## Cursor Cloud specific instructions

Single Next.js 16 (Turbopack) + React 19 app; package manager is **npm** (`package-lock.json`). Dependencies are refreshed automatically on startup (`npm install`).

- **Run dev server:** `npm run dev` (Next.js on `http://localhost:3000`). Standard scripts in `package.json`: `npm run lint`, `npm run build`, `npm run start`.
- **Runs without secrets:** the app boots and degrades gracefully with **no API keys**. Copy `.env.example` to `.env.local` if you want to add keys, but it is optional for local dev/testing.
- **Live data without a key:** `/gate` and `/api/gate/skills` render real data via public Binance/DexScreener fallbacks in "degraded" mode. `DATA UNAVAILABLE` and `WAIT`/`UNKNOWN` verdicts are intentional honest states, not bugs.
- **CMC_API_KEY caveat:** `/api/gate/evaluate`, `/api/gate/backtest`, and `/api/meridian/intelligence` hard-require `CMC_API_KEY` (without it: error / 503 / 500). Everything else, including the `/gate` UI and `/api/gate/skills`, works without it. When the key is present, the evidence ledger flips to `CMC live · sync live` and the 90-day replay returns real trades. Cloud runs inject `CMC_API_KEY` as an env var at VM start, so `npm run dev` picks it up automatically — but a dev server that was already running before the secret was added must be restarted to see it.
- **Lint is pre-existing-dirty:** `npm run lint` currently reports pre-existing errors/warnings in `src/lib/**` unrelated to environment setup — do not treat a non-zero lint exit as a broken environment.
- **Persistence is optional:** without Supabase env vars, storage falls back to in-memory/`/tmp` JSON (`src/lib/storage.ts`); no database needs to run for local dev.
- **Windows-only scripts:** several `scripts/*.ps1` (and the `finish`/`sync:*` npm scripts) are PowerShell deploy helpers — ignore them on Linux. Use the `*.mjs` Node scripts and `bnb:*` engine scripts (`npm run bnb:smoke` is a no-key engine sanity check).
- **Sub-projects:** `contracts/` is a Foundry/Solidity project (needs `forge`, not required for the web app); `bnb-hack/` holds Node CLI engines referenced by some API routes.
