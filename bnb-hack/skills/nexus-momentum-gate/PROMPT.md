# Invoke MERIDIAN Momentum Constitution (CMC Strategy Skill)

Copy into your LLM agent:

```
Generate a backtestable trading strategy for BNB using CoinMarketCap data.

1. search_cryptos → BNB id
2. get_crypto_quotes_latest → price, volume, percent_change_1h/24h/7d, market_cap
3. get_crypto_technical_analysis → RSI, MACD
4. get_global_metrics_latest → fear_greed_index
5. Apply STRATEGY_SPEC.md entry/exit rules (momentum + RSI + MACD + Fear & Greed)
6. Output JSON per OUTPUT_SCHEMA.json with position LONG or FLAT and a strategy thesis
7. Reference backtest: npm run bnb:backtest -- --symbol BNB --days 90
```

Expected response shape:

```
## Strategy · BNB
**Position:** LONG | FLAT
**Signal:** Enter long | Hold flat | Exit
**Thesis:** [one paragraph from rules, not raw indicator dump]
**Backtest:** run npm run bnb:backtest -- --symbol BNB --days 90
```
