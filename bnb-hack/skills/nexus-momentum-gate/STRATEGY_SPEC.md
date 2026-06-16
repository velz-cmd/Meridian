# NEXUS Momentum Gate — Strategy Specification (Backtestable)

**Version:** 1.1.0  
**Author:** MERIDIAN / NEXUS  
**Data source:** CoinMarketCap Agent Hub (MCP)  
**Hackathon:** BNB Hack Track 2 — Strategy Skills  
**Output schema:** [`OUTPUT_SCHEMA.json`](./OUTPUT_SCHEMA.json)

---

## 1. Objective

**Agent-grade pre-trade conviction gate** for liquid CMC-listed assets. Default state: **FLAT/HOLD**. Only **ENTER_LONG** on A/A+ tier when weighted gate agreement clears statistical bars — mirroring MERIDIAN NEXUS `enforceSignalGate` (`src/lib/signal-gate.ts`).

This is **not** generic coin research. It is the **constitution** an autonomous agent must pass before sizing.

---

## 2. Universe

| Tier | Rule |
|------|------|
| **Primary** | CMC rank ≤ 200, `volume_24h` ≥ $5M |
| **BNB Hack overlay** | Prefer BEP-20 tokens on competition whitelist when executing on BSC |
| **Exclude** | Stablecoins (USDT, USDC, DAI, FDUSD) as signal targets |

---

## 3. Data inputs (CMC MCP)

| Field | MCP tool | Use |
|-------|----------|-----|
| `price` | `get_crypto_quotes_latest` | PnL, backtest |
| `percent_change_1h` | quotes | Intraday structure |
| `percent_change_24h` | quotes | Momentum band |
| `percent_change_7d` | quotes | Trend context |
| `volume_24h` | quotes | Turnover |
| `market_cap` | quotes | Turnover, established cap tier |
| `rsi` | `get_crypto_technical_analysis` | Overbought filter |
| `macd_signal` | technical analysis | Trend confirmation |
| `fear_greed_index` | `get_global_metrics_latest` | Macro gating |
| whale concentration | `get_crypto_metrics` | Holder overlay (optional) |

---

## 4. Derived metrics

```
turnover = volume_24h / market_cap
established = market_cap >= 80_000_000 OR liquidity_usd >= 500_000
crime_dump = change_1h <= -8 AND change_24h > 15
pump_dump = change_24h > 8 AND change_1h < -6
pump_fade = change_1h > 12 AND change_7d < change_24h * 0.5
fake_moon = change_24h >= 80 AND (change_1h < -10 OR rsi > 78 OR buy_flow < 0.48)
agreement = sum(passed_check_weights) / sum(all_weights)
edge = f(passed_checks, fear_greed) — see engine
```

---

## 5. Gate checks (weighted)

| ID | Weight | Pass condition |
|----|--------|----------------|
| macro_fg | 8 | fear_greed ≤ 85 |
| momentum_band | 12 | Established: `change_1h ≥ 4` OR `change_24h ∈ [-12, 42]`; Else: `change_24h ∈ [8, 88]` and not extended pump |
| intraday | 14 | No crime_dump, no pump_fade; structure not collapsing |
| rsi | 10 | rsi ∈ [35, 72] |
| macd | 10 | macd ≠ bearish OR change_24h < 15 |
| turnover | 8 | turnover ∈ [0.02, 0.35] established / 0.28 micro |
| flow | 12 (4 if n/a) | buy_flow_ratio ≥ 0.52 if available |
| holders | 10 (4 if n/a) | top10_holder_pct < 72 if available |
| structure | 16 | NOT fake_moon / crime_dump / pump_fade |

---

## 6. Tier & signal rules

```
IF crime_dump OR pump_dump OR fake_moon:
  tier = avoid; signal = AVOID

ELIF established AND agreement >= 0.72 AND edge >= 28 AND passed >= 7:
  tier = a-plus; signal = ENTER_LONG
ELIF established AND agreement >= 0.52 AND edge >= 22 AND passed >= 5:
  tier = a; signal = ENTER_LONG
ELIF NOT established AND agreement >= 0.78 AND edge >= 36 AND passed >= 8:
  tier = a-plus; signal = ENTER_LONG
ELIF NOT established AND agreement >= 0.62 AND edge >= 28 AND passed >= 6:
  tier = a; signal = ENTER_LONG

ELIF edge < -22 OR rsi < 35 OR change_24h < -20:
  signal = EXIT
ELIF agreement < 0.45 OR rsi > 78 OR fear_greed > 88:
  signal = EXIT if change_24h < -15 else AVOID
ELSE:
  tier = watch; signal = HOLD
```

### Agent override (`enforceAgentGate`)

```
IF agent.action == BUY AND gate.signal != ENTER_LONG:
  finalAction = HOLD; confidence = min(agent, gate)
IF gate.tier == avoid:
  finalAction = AVOID or EXIT
```

---

## 7. Position management (backtest)

| Current | Signal | Action |
|---------|--------|--------|
| FLAT | ENTER_LONG | Open long 100% notional |
| LONG | EXIT / AVOID | Close to FLAT |
| LONG | HOLD | Maintain |
| FLAT | HOLD / AVOID | Stay flat |

**Risk overlay (live, optional):** max 1 open position per symbol; 8% stop / 15% take-profit.

---

## 8. Backtest protocol (Quantopian-style)

| Parameter | Value |
|-----------|-------|
| Bar frequency | Daily (EOD quotes) |
| Warmup | 14 bars for RSI stability |
| Fees | 10 bps per side (configurable `--fee-bps`) |
| Slippage | 0 default (`--slippage-bps 5` stress test) |
| Initial capital | 1.0 normalized |
| Look-ahead | **None** — signals use same-bar data only |

**Metrics reported:**

| Metric | Description |
|--------|-------------|
| `totalReturnPct` | Net equity return after fees |
| `maxDrawdownPct` | Peak-to-trough drawdown |
| `winRatePct` | Winning round-trips / total round-trips |
| `roundTrips` | Completed buy→sell cycles |
| `avgWinPct` / `avgLossPct` | Per-trade averages |

**Runner:**

```bash
node bnb-hack/backtest/run.mjs --symbol BNB --days 90
npm run bnb:backtest
```

---

## 9. Example structured output

```json
{
  "schema": "nexus-momentum-gate/v1",
  "symbol": "BNB",
  "signal": "ENTER_LONG",
  "tier": "a-plus",
  "confidence": 64,
  "risk": 38,
  "agreement": 0.82,
  "edge": 32,
  "checksPassed": 8,
  "checksTotal": 9,
  "thesis": "BNB: A+ setup — 8/9 checks, edge +32.",
  "agentDirective": "Agent may propose tactical long; cap confidence at gate value."
}
```

---

## 10. Agent Hub integration

1. Fetch CMC data via MCP tools in `SKILL.md` frontmatter  
2. Apply §4–6 rules (or call `evaluateNexusGate` / `enforceAgentGate`)  
3. Emit JSON per `OUTPUT_SCHEMA.json` + human thesis  

---

## 11. References

- MERIDIAN NEXUS live desk: https://trader-arc.vercel.app/nexus  
- Judge demo: https://trader-arc.vercel.app/bnb  
- Engine: `bnb-hack/engine/nexus-gate.mjs`  
- CMC Skills template: https://github.com/coinmarketcap-official/skills-for-ai-agents-by-CoinMarketCap  
