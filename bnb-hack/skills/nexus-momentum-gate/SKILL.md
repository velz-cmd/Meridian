---
name: meridian-momentum-constitution
description: |
  Turns CoinMarketCap market data into a backtestable crypto trading strategy.
  Blends RSI, MACD, and Fear & Greed into explicit entry and exit rules (Quantopian-style).
  Use when users ask to generate a strategy from CMC data, backtest a momentum rule set,
  or produce a STRATEGY_SPEC for BNB/CAKE/any CMC-listed asset.
  Trigger: "momentum strategy [coin]", "CMC strategy [coin]", "backtest momentum [coin]"
license: MIT
compatibility: ">=1.0.0"
user-invocable: true
allowed-tools:
  - mcp__cmc-mcp__search_cryptos
  - mcp__cmc-mcp__get_crypto_quotes_latest
  - mcp__cmc-mcp__get_crypto_technical_analysis
  - mcp__cmc-mcp__get_crypto_metrics
  - mcp__cmc-mcp__get_global_metrics_latest
---

# MERIDIAN Momentum Constitution — CMC Strategy Skill

**BNB Hack Track 2 deliverable:** an LLM Skill that **turns CoinMarketCap market data into a trading strategy** — not a live-trading bot.

## What this Skill produces

1. **Strategy rules** — entry, exit, position sizing (see `STRATEGY_SPEC.md`)
2. **Six CMC skills** — momentum, sentiment, regime, trend alignment, liquidity depth, structural quality
3. **Structured signal** — LONG / FLAT / EXIT for today’s bar (`OUTPUT_SCHEMA.json`)
4. **Backtest reference** — same rules in `bnb-hack/engine/nexus-gate.mjs`

Default state: **FLAT**. Enter only when A/A+ tier conditions align.

## CMC MCP workflow

### 1. Resolve symbol

`search_cryptos` → numeric CMC id.

### 2. Market data

`get_crypto_quotes_latest` → price, market_cap, volume_24h, percent_change_1h/24h/7d.

### 3. Technicals

`get_crypto_technical_analysis` → RSI (14), MACD signal.

### 4. Macro

`get_global_metrics_latest` → fear_greed_index.

### 5. Apply strategy rules

Map fields into the engine input (see `STRATEGY_SPEC.md` §4–6) or call `evaluateNexusGate(snapshot)`.

### 6. Emit output

Return JSON per `OUTPUT_SCHEMA.json` plus a one-paragraph strategy thesis.

## Example input (YAML)

```yaml
symbol: BNB
price: 650.2
marketCap: 95000000000
volume24h: 1800000000
change1h: 1.2
change24h: 4.5
change7d: 8.1
rsi: 58
macdSignal: bullish
fearGreed: 62
```

## Example output

```json
{
  "schema": "nexus-momentum-gate/v1",
  "symbol": "BNB",
  "signal": "ENTER_LONG",
  "position": "LONG",
  "tier": "a-plus",
  "thesis": "BNB: A+ setup — 8/9 checks, edge +32. Size small; invalidate on 1h roll-over."
}
```

## Backtest (Quantopian-style)

```bash
npm run bnb:backtest -- --symbol BNB --days 90
```

Live demo: https://trader-arc.vercel.app/gate

## Files

| File | Purpose |
|------|---------|
| `STRATEGY_SPEC.md` | Backtestable rule document (judge deliverable) |
| `PROMPT.md` | Copy-paste agent invocation |
| `OUTPUT_SCHEMA.json` | Structured strategy output |
| `../engine/nexus-gate.mjs` | Deterministic rule engine |
