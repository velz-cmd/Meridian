---
name: meridian-trend-alignment
description: |
  Multi-timeframe trend alignment from CoinMarketCap quote deltas (1h, 24h, 7d, 30d).
  Detects distribution (7d up, 24h/1h rolling over) vs aligned bullish recovery.
---

# Trend Alignment Skill

Uses **only CMC `/v1/cryptocurrency/quotes/latest`** percent changes.

## Rules

| Check | Pass |
|-------|------|
| 24h/7d not fighting | Same sign or 7d flat |
| 1h hold | If 24h &gt; 0, 1h ≥ −8% |
| 30d support | 30d not fighting 24h when available |
| No distribution | Not (7d &gt; 8% AND 24h &lt; −4% AND 1h &lt; −3%) |

Engine: `bnb-hack/engine/meridian-skills.mjs` → `evaluateTrendAlignmentSkill`
