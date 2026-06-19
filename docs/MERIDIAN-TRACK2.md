# MERIDIAN Track 2 — Market Intelligence Operating System

**Team:** MERIDIAN (@Meridian_AIO) · **Live:** https://trader-arc.vercel.app/gate

---

## Core philosophy

MERIDIAN is **not an AI predictor**. It is a **market intelligence operating system**.

- **CoinMarketCap APIs** provide raw materials (price, volume, F&G, categories, global metrics).
- **8 deterministic Skills** are calculators — they output score, evidence, confidence, explanation. Skills never output BUY/SELL.
- **Bull Court / Bear Court** show adversarial disagreement — never forced agreement.
- **Constitution Engine** makes GRANT / DENY / WAIT / UNKNOWN judgments. Risk and liquidity have veto power.
- **Memory layer** (Market Twin, Historical Analog, Trade DNA) provides references — not predictions.
- **Counterfactual Engine** stress-tests every thesis (BTC −5%, volume collapse, F&G shock).
- **LLM sits near the end** for narration only — never at the beginning for numbers.

> Truthfulness beats optimism. Prefer **WAIT** over fake certainty.

---

## Architecture

```
CMC APIs
    ↓
Raw data layer (fieldSources, freshness, cmcLive)
    ↓
Feature engineering (RSI, MACD, turnover, RS vs BNB, ATR)
    ↓
8 Skills (evidence only)
    ↓
Bull Court ↔ Bear Court
    ↓
Constitution Engine (6/9 votes, bear cap 15%, liquidity veto)
    ↓
Memory Layer (Twin, Analog, DNA, Replay)
    ↓
Counterfactual Engine
    ↓
Final Verdict (GRANT | DENY | WAIT | UNKNOWN)
```

---

## Golden rules (10)

1. Never hallucinate.
2. Never create synthetic values.
3. Never assume missing data — mark DATA UNAVAILABLE.
4. Every output cites its data source.
5. Every score is reproducible via API.
6. Risk overrides opportunity.
7. No single skill dominates the system.
8. Disagreement is healthy.
9. Uncertainty must be visible.
10. If data quality is low, abstain.

Full constants: `src/lib/meridian-philosophy.ts`

---

## CMC skills (live)

| Skill | CMC inputs | Evidence |
|-------|------------|----------|
| Momentum | RSI, MACD, F&G | checks + metrics |
| Sentiment | quote deltas, turnover | divergence state |
| Regime | F&G, BTC dominance | risk-on/off |
| Trend | 1h/24h/7d/30d MTF | alignment checks |
| Liquidity | volume, market cap | turnover veto |
| Structural | rank, cap tier | quality checks |
| Relative strength | vs BNB benchmark | RS % |
| Volatility | daily OHLC ATR | squeeze/expansion |

Engine: `bnb-hack/engine/meridian-skills.mjs`

---

## WOW features (MERIDIAN intelligence — not CMC endpoints)

| Feature | Status | Module |
|---------|--------|--------|
| Market Twin | live | historical analog similarity |
| Bull vs Bear Court | live | 9-layer weighted consensus |
| Constitution Engine | live | permit + 6 articles |
| Counterfactual | live | gate re-eval stress |
| Conviction Decay | live | half-life curve |
| Trade Autopsy | partial | NEXUS demo trades + skill attribution |
| Market Replay | partial | 90-day backtest + timeline slider |
| Trade DNA | live | thesis genome encoding |

---

## Judge APIs

```bash
# Live gate + 8 skills + evidence
curl "https://trader-arc.vercel.app/api/gate/evaluate?symbol=CAKE"
curl "https://trader-arc.vercel.app/api/gate/skills?symbol=BNB"

# Unified intelligence (v2 — verdict, provenance, explainability)
curl "https://trader-arc.vercel.app/api/meridian/intelligence?symbol=CAKE"

# 90-day backtest proof
curl "https://trader-arc.vercel.app/api/gate/backtest?symbol=BNB&days=90"

# Public traction
curl "https://trader-arc.vercel.app/api/bnb/analytics"
```

---

## What CMC alone cannot provide

Smart money wallet tracking, exchange flows, orderbook depth, liquidation heatmaps — require other providers (GMGN hooks exist in NEXUS for optional enrichment).

---

## Reproducibility

Every conviction score traces to:
- `GET /api/gate/evaluate` — constitution + skills composite
- `GET /api/meridian/intelligence` — memory + court + counterfactual layer
- `npm run bnb:backtest -- --symbol BNB --days 90` — CLI same engine as API

No synthetic fixtures in public judge APIs.
