---
name: meridian-volatility-compression
description: |
  ATR squeeze/expansion from daily OHLC (Binance venue or CMC historical closes).
  Blocks whip entries during expansion; favors coiled setups before gate longs.
---

# Volatility Compression Skill

## Data sources (labeled in `dataSource`)

1. **Binance spot daily OHLC** — preferred when CMC historical tier is limited (`binance-klines.mjs`)
2. **CMC historical closes** — fallback ATR from close series (`volatility-metrics.mjs`)

## Metrics

- `atr5`, `atr14` — average true range as % of price
- `compressionRatio = atr5 / atr14`
- `squeeze` — ratio ≤ 0.72 and range percentile ≤ 35
- `expansion` — ratio ≥ 1.35 or range percentile ≥ 75

## Rules

| Check | Fail → |
|-------|--------|
| ATR > 11% of price | size caution |
| Expansion + \|1h\| > 7% | AVOID → `vol-whip` |
| Expansion + \|1h\| > 5% | EXIT → `vol-expansion` |
| Squeeze + RSI 35–68 | ENTER_LONG bias |

## Honest limit

When no daily bars exist, skill returns `state: unknown` and does **not** block the gate.

Engine: `bnb-hack/engine/volatility-metrics.mjs` + `meridian-skills.mjs` → `evaluateVolatilityCompressionSkill`
