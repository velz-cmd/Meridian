---
name: meridian-regime-detection
description: |
  Switches strategy mode from CMC Fear & Greed + global market metrics (BTC dominance, total cap change).
  Derivatives positioning proxied honestly — no synthetic funding rates on gate path.
---

# Regime Detection Skill

## Data (CMC)

- Fear & Greed index
- Global metrics: BTC dominance, total market cap 24h change, altcoin cap change

## Regimes

| Regime | Trigger |
|--------|---------|
| risk-off | F&G < 30 or (mkt 24h < −3% and F&G < 40) |
| risk-on | F&G > 70 and mkt 24h > +1% |
| neutral | else |

## Positioning proxy

- `crowded-long-unwind` — risk-off + 7d < −5% + F&G < 35
- `capitulation` — risk-off + F&G < 25
- `crowded-long` — risk-on + F&G > 75

## Strategy mode

| Mode | When |
|------|------|
| defensive | risk-off + crowded-long-unwind |
| tight | risk-off or crowded-long |
| aggressive | risk-on, not crowded |
| standard | neutral |

Engine: `bnb-hack/engine/meridian-skills.mjs` → `evaluateRegimeSkill`
