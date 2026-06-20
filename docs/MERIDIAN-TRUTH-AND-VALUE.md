# MERIDIAN Truth and Value Principle

> **Cosmetic intelligence is forbidden. MERIDIAN must never pretend.**

This is **global MERIDIAN law** — not limited to Gate. It applies to every present and future module across the entire ecosystem.

**Related:** [Master Principles](./MERIDIAN-MASTER-PRINCIPLES.md) · [North Star](./MERIDIAN-NORTH-STAR.md) · `src/lib/meridian-truth-guard.ts`

---

## The principle

Every feature, API, chart, agent, skill, calculation, signal, notification, explanation, automation, and interaction must create **genuine value**:

| Required | Forbidden |
|----------|-----------|
| Real data | Cosmetic intelligence |
| Real reasoning | Fake intelligence |
| Real accountability | Fabricated confidence |
| Honest uncertainty | Artificial complexity |
| Traceable sources | Placeholder reasoning |

**Truth is more important than appearance.**

---

## Global law (non-negotiable)

1. **Never fabricate** numbers, prices, RSI, volume, conviction, win rates, or social metrics.
2. **Never invent confidence** — confidence is evidence strength, not probability of profit.
3. **Never hide missing data** — mark **DATA UNAVAILABLE** and reduce conviction.
4. **Never use placeholder reasoning** — every explanation must cite skills, sources, or deterministic logic.
5. **Never add artificial complexity** — depth must serve explainability, not impress users.
6. **Never pretend** — if a module cannot produce real value yet, label it **partial** or **unavailable**, not live.
7. **Always show** timestamps, data quality, source, and degradation when feeds fail.
8. **Always account** — losses, drawdowns, and failed trades are published where trades exist.

---

## Ecosystem scope

| Module | Route / API | Truth requirements |
|--------|-------------|-------------------|
| **Gate** | `/gate`, `/api/gate/*` | Live CMC or explicit degraded; skills deterministic; replay from real bars |
| **Intelligence** | `/api/meridian/intelligence` | Provenance block; WAIT/UNKNOWN when data thin; analogs labeled reference-only |
| **NEXUS** | `/nexus`, `/api/nexus/*` | Constitution permit from real gate; trades on testnet with thesis snapshot; LLM narrates only |
| **PRISM** | `/prism`, `/api/prism/*` | Macro/events from real feeds; no invented predictions |
| **Analytics** | `/analytics` | Wallet/on-chain or demo trades labeled; no fabricated PnL |
| **Constitution** | `/api/constitution/*` | CMC-only permit; backtest proof separate — no synthetic counterfactual in permit |
| **Agents** | Autopilot, decide, chat | Discipline over trade count; cite gate/skills; never invent market numbers |

Every new module **must** register in `MERIDIAN_ECOSYSTEM_MODULES` (`src/lib/meridian-truth-guard.ts`) before shipping.

---

## What “real value” means per surface

### APIs
- Return `meridianTruth` envelope (module, source, dataIntegrity, fetchedAt).
- Include `dataIntegrity: cmc-only-no-synthetic` or explicit degraded label.
- Errors must explain what failed — not return silent defaults.

### Skills
- Deterministic calculators only — evidence, score, explanation.
- Skills **never** emit BUY/SELL.
- Missing inputs → lower score + explicit gap, not guessed values.

### Charts
- Plot real series only — backtest equity, live quotes, recorded trades.
- Empty chart + honest empty state beats fake curves.

### Agents & automation
- Enforce capital preservation and constitution — not maximize activity.
- Every action traceable to permit + skill evidence at decision time.

### UI copy & LLM
- LLM sits **near the end** for narration — never at the beginning for numbers.
- No “95% accuracy”, “guaranteed profit”, or oracle language.

---

## Enforcement checklist (every PR)

- [ ] Data traces to a live API, on-chain read, or deterministic replay
- [ ] Missing data → DATA UNAVAILABLE or WAIT/UNKNOWN — not zeros or guesses
- [ ] Confidence labeled evidence-derived — not probability
- [ ] Module registered in `MERIDIAN_ECOSYSTEM_MODULES` if new
- [ ] `meridianTruth` envelope on new intelligence API responses
- [ ] Losses and drawdowns visible where trades are tracked
- [ ] No feature shipped purely for visual impressiveness

---

## Implementation

| Artifact | Purpose |
|----------|---------|
| `src/lib/meridian-philosophy.ts` | `MERIDIAN_TRUTH_*` constants |
| `src/lib/meridian-truth-guard.ts` | Envelope builder, module registry, display helpers |
| `src/lib/meridian-llm-context.ts` | Truth law injected into all NEXUS LLM prompts |
| `AGENTS.md` | Universal agent block — applies before any module edit |

**Cosmetic intelligence is forbidden everywhere. Truth is the product.**
