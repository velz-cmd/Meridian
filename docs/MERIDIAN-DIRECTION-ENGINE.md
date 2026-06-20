# MERIDIAN Direction Engine — Evidence, Not Activity

> **FLAT is not failure. FLAT is a position.**

Professional systems spend most of their time flat. MERIDIAN must never bias toward LONG, SHORT, or FLAT. Direction emerges from evidence.

**Implementation:** `src/lib/meridian-direction-engine.ts` · Intelligence API field: `directionEvidence`

> Canonical spec: **`docs/MERIDIAN-DECISION-ENGINE.md`**

---

## Signal generation philosophy

MERIDIAN is an **evidence-based market intelligence system**.

- Signals are **not predictions** — they summarize evidence.
- **LONG, SHORT, and FLAT** are consequences of evidence, not defaults.
- **Never force a signal.** WAIT and FLAT are valid answers.
- **Trade quality > trade quantity.** No trade beats a low-quality trade.

---

## Decision architecture (7 layers)

| Layer | Weight | Veto? |
|-------|--------|-------|
| Market regime | 25% | **Yes** — risk-off / liquidity can force FLAT |
| Trend | 20% | |
| Momentum | 15% | |
| Relative strength | 15% | |
| Liquidity | 15% | **Yes** — failed liquidity gate |
| Market memory | 10% | Reference only — similarity, not forecast |
| Bull vs Bear Court | — | Disagreement lowers conviction |

Risk and regime have **veto power** over opportunity.

---

## Direction scores (not “7/9 = LONG”)

Every evaluation produces:

```
LONG SCORE     = evidence for exposure
SHORT SCORE    = evidence for de-risk / rotate
UNCERTAINTY    = hold, conflict, data gaps
EVIDENCE VERDICT = LONG | SHORT | FLAT | WAIT
```

### Examples

**Strong long** — Long 82 · Short 29 · Uncertainty 18 → **LONG**

**Mixed environment** — Long 58 · Short 49 · Conflict high → **FLAT**

**Strong short** — Long 24 · Short 80 · Risk elevated → **SHORT**

**Insufficient data** → **WAIT** (never fabricate direction)

---

## Constitution vs evidence direction

| Field | Meaning |
|-------|---------|
| **Evidence direction** | LONG / SHORT / FLAT / WAIT from layer scores |
| **Constitution permit** | GRANT / DENY — execution gate; can deny even when scores lean long |

A high long score with **DENY** permit → evidence may show lean-long, but **position stays FLAT**. That is disciplined, not broken.

---

## Multi-timeframe structure (roadmap)

MERIDIAN will not let micro bars dominate swing decisions.

| Bucket | Timeframes |
|--------|------------|
| Micro | 3m · 5m · 15m |
| Intraday | 30m · 1h · 4h |
| Swing | 12h · 1d · 3d · 1w |

**Live today (CMC desk):** 1h · 24h · 7d · 30d via trend alignment skill — partial timeframe consensus until full bar feeds ship.

Each timeframe gets its own trend, momentum, structure, liquidity, RS, regime, volume read. Higher timeframes anchor horizon; lower timeframes refine timing — never override alone.

---

## Router rules

| Choose | When |
|--------|------|
| **LONG** | Long score strong, short score weak, uncertainty low, no veto |
| **SHORT** | Short score strong (de-risk / rotate to stable), long weak, uncertainty low |
| **FLAT** | High disagreement, moderate scores, veto active, or weak evidence |
| **WAIT** | Data unavailable or degraded without consensus |

**Most important rule:** MERIDIAN has **no preferred direction**. Objective is disciplined decision quality — not activity.

---

## Multi-agent Constitution Engine

Nine CMC skill layers act as attorneys in Bull vs Bear Court. The Constitution Engine **synthesizes** weighted evidence — it is not a simple checklist. Disagreement, data quality, and risk vetoes are visible; conviction decreases when they increase.

This architecture is harder to copy than “checks passed = long” and aligns with Track 2 trust goals.
