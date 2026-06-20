# MERIDIAN Design System V2

Premium market intelligence operating system — Apple clarity, Linear organization, Stripe polish, Bloomberg depth, Palantir intelligence.

**Canonical parent doc:** [MERIDIAN Master Principles](./MERIDIAN-MASTER-PRINCIPLES.md)

**This is a reorganization standard, not a simplification mandate.**

## Critical rule

If a proposed change removes a feature, metric, card, skill, or capability — **reject it**. Reorganize instead. Preserve 100% of MERIDIAN intelligence while improving hierarchy and usability.

## Design philosophy

- Powerful underneath. Calm on the surface.
- Complexity is progressively revealed.
- Users see: **Answer → Reason → Mechanics → Research**
- Trustworthy, spacious, premium. No visual noise, no button clutter, no developer-dashboard aesthetics.

## Information hierarchy

1. **Verdict** — Should I act?
2. **Thesis** — Why should I care?
3. **Debate** — Who disagrees? (Technical tab)
4. **Evidence** — What do skills show? (Technical tab)
5. **Research** — Full depth (expand / other tabs)

One question per card. Every section has a single purpose.

## Tab contracts

| Tab | Question | Contains |
|-----|----------|----------|
| **Overview** | Should I care? | Hero verdict, conviction, bull–bear spread, risk, horizon, thesis, constitution summary, narrative summary, live CMC strip, execution CTA |
| **Market Memory** | Have we seen this before? | Historical Twin, DNA matches, conviction decay, trade autopsy, historical statistics |
| **Technical & Reasoning** | Why does MERIDIAN believe this? | Chambers (Market, Flow, Behavior, Risk, Memory), bull/bear debate, skill evidence |
| **Rules & Spec** | How does MERIDIAN think? | Constitution, weighting, risk rules, sizing, CMC sources, skill explanations |
| **90-Day Replay** | What would MERIDIAN have done? | Timeline controls, backtest proof |

## Progressive disclosure

- **Default:** executive summary (score + stance + one-line reason).
- **Expanded:** full quant research (RSI, MACD, checks, evidence arrays).
- Never remove details — hide until requested. Use `<details>`, accordions, drawers.

## Skill card pattern (required)

**Bad:** one card with RSI, MACD, ADX, volume, risk, confidence, signals, explanation.

**Good:**

```
Momentum          Score 84    Strong
Reason: Trend persistence healthy.
[Expand] → RSI, MACD, F&G, check counts
```

Implementation: `GateSkillLayerCard` + `buildGateSkillLayers()` in `src/lib/gate-skill-layers.ts`.

## Button philosophy

- Primary actions stay visible (one trade/review CTA on Overview).
- Secondary actions: text links, chips, accordions, `⋮` menus — not button walls.
- Tab bar is the main navigation control (5 tabs max).

## Data honesty (required)

| Layer | Source | UI label |
|-------|--------|----------|
| Market quotes, RSI, F&G, volume | Live CMC API | “CMC live feed” or “DATA UNAVAILABLE” |
| Skills & gate | CMC snapshot → deterministic calculators | Per-symbol, never stale on switch |
| Historical analogs | Reference library (2023–2026) | “Historical episode” — not today’s price |
| Wallet settlement | BSC Testnet (Chapel) | Disclose proxy routes (FLOKI→CAKE, XVS→BNB) |

Benchmark whitelist: **BNB · CAKE · FLOKI · XVS (Venus)** — not XVX.

Prefer **WAIT / UNKNOWN** over fabricated certainty.

## Typography tokens (Gate / MERIDIAN desk)

| Role | Tailwind guidance |
|------|-------------------|
| Hero verdict | `text-4xl font-semibold tracking-tight` |
| Hero stat value | `text-2xl font-semibold tabular-nums` |
| Section title | `text-sm font-semibold text-white` |
| Section question | `text-xs text-white/45` (sentence case, not shouty mono) |
| Summary body | `text-sm text-white/70 leading-relaxed` |
| Meta / source | `text-[11px] text-white/40` |

Use mono sparingly — sources, IDs, timestamps only.

## Spacing

- Section gap: `space-y-6` on tab roots.
- Card padding: `p-5` minimum on hero sections.
- Whitespace creates trust — avoid tight card stacks.

## Animation

Subtle, fast (`transition duration-200`), hierarchy-only. No flashy glow or casino motion.

## Visual direction

Inspired by: Apple, Linear, Arc Browser, Stripe, Bloomberg terminal (calm), Palantir.

Avoid: crypto casinos, overloaded TradingView clones, neon clutter.

Gate CSS tokens live in `src/styles/gate-skill.css` under `[data-gate-page]`.

## Agent checklist (before merging Gate UI)

- [ ] No features/skills/cards removed
- [ ] Overview has no low-level indicator grids (only summaries)
- [ ] Each skill uses summary + expand pattern
- [ ] Symbol switch clears stale intelligence
- [ ] Live vs testnet execution labeled
- [ ] Missing CMC → explicit unavailable state

See also: [MERIDIAN Master Principles](./MERIDIAN-MASTER-PRINCIPLES.md), `src/lib/meridian-philosophy.ts`, `AGENTS.md`.
