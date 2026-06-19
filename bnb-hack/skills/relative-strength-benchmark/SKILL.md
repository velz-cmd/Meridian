---
name: meridian-relative-strength
description: |
  BSC capital rotation via relative strength vs BNB from CoinMarketCap quote deltas.
  Ranks marginal desk allocation — leader/laggard/fade roles feed conviction router.
---

# Relative Strength vs BNB Skill

Uses **CMC `/v1/cryptocurrency/quotes/latest`** percent changes from the same batch as the gate desk.

## Benchmark

| Symbol | Benchmark |
|--------|-----------|
| CAKE, BUSD, etc. | BNB snapshot from batch |
| BNB | Alt basket (macro `altcoin_market_cap` Δ24h) |

## Metrics

- `rs24h = token.change24h − benchmark.change24h`
- `rs7d = token.change7d − benchmark.change7d`
- `rotationScore = clamp(50 + rs24×2.2 + rs7×0.8 + rs1×0.6, 0, 100)`

## Roles & signals

| Role | Condition | Signal |
|------|-----------|--------|
| leader | rs24 ≥ 2, rs7 ≥ −1 | ENTER_LONG |
| laggard | rs24 ≤ −4, rs7 ≤ −2 | AVOID → blocker `rs-laggard` |
| fade | rs7 > 4, rs24 < −2 | EXIT → blocker `rs-fade` |
| outperform | rs24 > 0, checks pass | ENTER_LONG |

## Router impact

`gate-router.mjs` boosts conviction for `leader`/`outperform`, penalizes `laggard`/`fade`.

Engine: `bnb-hack/engine/meridian-skills.mjs` → `evaluateRelativeStrengthSkill`
