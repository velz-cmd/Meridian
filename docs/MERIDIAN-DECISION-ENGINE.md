# MERIDIAN Decision Engine

> MERIDIAN does not predict. MERIDIAN synthesizes evidence.

**Implementation:** `src/lib/meridian-direction-engine.ts` · API field: `directionEvidence`

---

## Purpose

- LONG, SHORT, and FLAT are **consequences of evidence** — never forced defaults.
- **WAIT** and **UNKNOWN** are valid answers.
- **No trade beats a low-quality trade.** Trade quality > trade frequency.

---

## Directional neutrality

MERIDIAN has **no preferred direction**. It is not permanently bullish, bearish, or flat.

| Condition | Verdict tendency |
|-----------|------------------|
| Evidence strongly favors long | LONG |
| Evidence strongly favors short | SHORT |
| Uncertainty or disagreement dominates | FLAT |

The system adapts continuously to live market conditions.

---

## Multi-timeframe intelligence

Never use one timeframe alone. Lower timeframes provide sensitivity; higher timeframes provide stability.

| Bucket | Timeframes | Role |
|--------|------------|------|
| Scalping | 3m · 5m | Micro sensitivity |
| Short-term | 15m · 30m | Tactical |
| Intraday | 1h · 4h | Session |
| Swing | 12h · 1d | Multi-day |
| Position | 3d · 1w | Structural |

**Rule:** Lower timeframes cannot override higher timeframes without consensus. Conflict reduces conviction.

**Live today (CMC desk):** 1h · 1d · 3d · 1w proxies via change feeds. Full bar stack is roadmap.

---

## Nine decision layers

| # | Layer | Veto? |
|---|-------|-------|
| 1 | Market Regime (F&G, breadth, vol, risk-on/off) | **Yes** |
| 2 | Trend (EMA, HH/HL, persistence) | |
| 3 | Momentum (RSI, MACD, ROC, ADX) | |
| 4 | Liquidity (volume, turnover, spread) | **Yes** |
| 5 | Relative Strength (vs BNB, peers, leaders) | |
| 6 | Structure (S/R, breakouts, integrity) | |
| 7 | Narrative Intelligence (rotation, migration) | |
| 8 | Market Memory (Twin, DNA, analogs, decay) | Reference |
| 9 | Bull vs Bear Court (disagreement lowers conviction) | |

Weights: `MERIDIAN_DECISION_LAYER_WEIGHTS` in code.

---

## Scoring (never “7/9 = LONG”)

Every evaluation publishes:

```
Long score
Short score
Hold score
Conflict score
Uncertainty score
Data quality score
Evidence verdict = LONG | SHORT | FLAT | WAIT
```

### Examples

**Strong long** — Long 78 · Short 22 · Hold 18 · Conflict low → **LONG**

**Mixed** — Long 55 · Short 51 · Conflict high → **FLAT**

**Strong short** — Long 18 · Short 81 · Risk elevated → **SHORT**

---

## Router vs evidence

| Surface | Role |
|---------|------|
| **Position router** (Overview ONE TRUTH) | Final desk action: LONG / SHORT / FLAT |
| **Decision engine scores** (Technical / API) | Evidence synthesis — explains, does not compete on Overview |

Constitution permit (GRANT/DENY) is an execution gate separate from evidence direction.

---

## Conviction decay

Every thesis expires. Review at 6h · 24h · 48h · 72h. Old evidence loses weight; fresh evidence gains weight.

---

## Data quality

- Live CMC + timestamped sources only.
- Never fabricate values or invent confidence.
- Lower data quality → lower conviction, higher uncertainty.
- Missing data → **WAIT**, not synthetic direction.

---

## Risk veto

Opportunity never overrides risk. Risk-off reduces size. Extreme uncertainty increases FLAT probability. Survival > prediction.

---

## Ultimate objective

Users should say:

- MERIDIAN does not always win.
- MERIDIAN does not always trade.
- When it acts, it usually has a reason.
- When it loses, it explains why.
- When uncertainty rises, it waits.
- When evidence strengthens, it adapts.

MERIDIAN behaves like a **disciplined professional** — not an overconfident oracle.
