# Invoke NEXUS Momentum Gate (CMC Agent Hub)

Copy into your agent when testing the Skill:

```
Use the nexus-momentum-gate Skill. For symbol BNB:
1. search_cryptos → get CMC id
2. get_crypto_quotes_latest → price, market_cap, volume, percent_change_1h/24h/7d
3. get_crypto_technical_analysis → RSI, MACD
4. get_global_metrics_latest → fear_greed_index
5. Optional: get_crypto_metrics → holder concentration
6. Apply STRATEGY_SPEC gate rules; emit OUTPUT_SCHEMA JSON + human summary
7. If upstream agent said BUY, run enforceAgentGate to clamp signal
```

Example expected output header:

```
## NEXUS Gate · BNB
**Signal:** ENTER_LONG · **Tier:** a-plus
**Confidence:** 64 · **Risk:** 38
**Agent directive:** Agent may propose tactical long; cap confidence at gate value.
```

Then run backtest reference:

```powershell
npm run bnb:backtest
node bnb-hack/backtest/run.mjs --symbol BNB --days 90
```
