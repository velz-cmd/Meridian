---
name: meridian-liquidity-depth
description: |
  Liquidity and volume quality from CMC market_cap, volume_24h, volume_change_24h.
  Blocks thin turnover and collapsing volume before Chapel sizing.
---

# Liquidity Depth Skill

## CMC fields

- `volume_24h / market_cap` — turnover
- `volume_24h` — absolute USD liquidity
- `volume_change_24h` — volume trend (when present on quote)

## Rules

| Fail | Signal |
|------|--------|
| Turnover &lt; 0.02 (non large-cap) | AVOID |
| Turnover &gt; 0.45 | AVOID (wash guard) |
| Volume Δ24h ≤ −40% | EXIT |

Engine: `bnb-hack/engine/meridian-skills.mjs` → `evaluateLiquidityDepthSkill`
