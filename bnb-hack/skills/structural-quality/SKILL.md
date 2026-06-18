---
name: meridian-structural-quality
description: |
  Benchmark structural quality from CMC market cap, cmc_rank, and FDV/mcap dilution ratio.
  Separates established BSC benchmarks from weaker profiles.
---

# Structural Quality Skill

## CMC fields

- `market_cap` — cap tier (≥$80M = benchmark)
- `cmc_rank` — list rank
- `fully_diluted_market_cap / market_cap` — dilution proxy

## Grades

- **benchmark** — large-cap, rank OK, dilution controlled
- **acceptable** — passes minimum checks
- **weak** — AVOID for aggressive sizing

Engine: `bnb-hack/engine/meridian-skills.mjs` → `evaluateStructuralQualitySkill`
