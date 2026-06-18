---
name: meridian-sentiment-divergence
description: |
  Flags when CMC price attention (quote deltas) diverges from volume flow (turnover / buy flow).
  Use before agent sizing on BNB, CAKE, or any CMC-listed benchmark.
---

# Sentiment Divergence Skill

Detects **heat without flow** (price up, weak turnover) and **flow without heat** (accumulation under flat tape).

## Data (CMC only on gate path)

- `percent_change_1h`, `percent_change_24h`, `percent_change_7d` — price heat proxy
- `volume_24h / market_cap` — flow proxy
- Optional `buyFlowRatio` when on-chain flow is available

## Rules

| State | Condition | Signal |
|-------|-----------|--------|
| BEARISH_DIVERGE | 24h > +2.5% and turnover weak | EXIT |
| HEAT_WITHOUT_FLOW | heat > 55, flow < 38 | AVOID |
| BULLISH_DIVERGE | 24h < −2.5% and flow strong | ENTER_LONG |
| ALIGNED | otherwise | HOLD / ENTER if both agree |

Engine: `bnb-hack/engine/meridian-skills.mjs` → `evaluateSentimentDivergenceSkill`
