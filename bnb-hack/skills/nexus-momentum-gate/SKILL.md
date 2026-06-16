---
name: nexus-momentum-gate
description: |
  NEXUS Agent Conviction Gate — a backtestable pre-trade veto layer for AI trading agents via CoinMarketCap MCP.
  Clamps agent BUY signals to statistically rare ENTER_LONG events using weighted gate checks (momentum, RSI/MACD,
  Fear & Greed, turnover, holder concentration, rug-pattern detection). Not generic coin research — an agent-grade
  constitution before sizing. Use when users ask "should my agent enter [coin]", "nexus gate [coin]",
  "pre-trade conviction", "veto agent buy", or "backtest swing gate on [coin]".
  Trigger: "nexus gate [coin]", "momentum setup [coin]", "run nexus strategy", "agent conviction [coin]", "/nexus-momentum-gate"
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

# NEXUS Momentum Gate Skill

**Strategy Skill for BNB Hack Track 2** — packages the MERIDIAN NEXUS desk gate (`trader-arc.vercel.app/nexus`) as a **CoinMarketCap Agent Hub Skill** that outputs a **backtestable, rule-based conviction signal** with transparent weighted checks.

## Core Principle

Default **HOLD/FLAT**. This Skill is a **pre-trade veto layer**: even if an upstream agent says BUY, only **ENTER_LONG** when A/A+ tier gates align. Most tokens remain WATCH — by design.

## Prerequisites

Before using CMC tools, verify the MCP connection. If tools fail, ask the user to configure:

```json
{
  "mcpServers": {
    "cmc-mcp": {
      "url": "https://mcp.coinmarketcap.com/mcp",
      "headers": {
        "X-CMC-MCP-API-KEY": "your-api-key"
      }
    }
  }
}
```

Get your API key: https://pro.coinmarketcap.com/login

## Workflow

### Step 1 — Resolve token

Call `search_cryptos` with user symbol (e.g. BNB, CAKE, ETH). Most tools need the numeric CMC **id**.

### Step 2 — Market snapshot

Call `get_crypto_quotes_latest` with the id for:
- `price`, `market_cap`, `volume_24h`
- `percent_change_1h`, `percent_change_24h`, `percent_change_7d`

### Step 3 — Technicals

Call `get_crypto_technical_analysis` for:
- RSI (14)
- MACD signal (bullish / bearish / neutral)

### Step 4 — Macro + holder context

Call `get_global_metrics_latest` for **fear_greed_index** (0–100).

Optional: `get_crypto_metrics` for whale concentration overlay (`top10HolderPct` proxy).

### Step 5 — Apply NEXUS Gate

Map MCP JSON into engine input and apply rules from [`STRATEGY_SPEC.md`](./STRATEGY_SPEC.md) or repo engine `bnb-hack/engine/nexus-gate.mjs`:

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

If an upstream agent already emitted BUY/SELL/HOLD, call `enforceAgentGate(snapshot, agentSignal)` to clamp it.

### Step 6 — Emit structured output

Return JSON matching [`OUTPUT_SCHEMA.json`](./OUTPUT_SCHEMA.json):

```json
{
  "schema": "nexus-momentum-gate/v1",
  "symbol": "BNB",
  "signal": "ENTER_LONG",
  "tier": "a-plus",
  "confidence": 64,
  "risk": 38,
  "agreement": 0.82,
  "checksPassed": 8,
  "checksTotal": 9,
  "thesis": "BNB: A+ setup — 8/9 checks, edge +32.",
  "agentDirective": "Agent may propose tactical long; cap confidence at gate value."
}
```

Also present human-readable summary:

```
## NEXUS Gate · [SYMBOL]

**Signal:** ENTER_LONG | HOLD | EXIT | AVOID
**Tier:** a-plus | a | watch | avoid
**Confidence:** NN/100 · **Risk:** NN/100 · **Agreement:** NN%

### Gate checks (weighted)
- [pass/fail] Fear & Greed not extreme greed
- [pass/fail] Momentum band
- [pass/fail] Intraday structure
- [pass/fail] RSI band
- [pass/fail] MACD alignment
- [pass/fail] Turnover sane
- [pass/fail] Buy flow / holders
- [pass/fail] Structure clean (no rug flags)

### Agent directive
[one line — clamp BUY / allow tactical long / force EXIT]

### Backtest
Run `npm run bnb:backtest` or `node bnb-hack/backtest/run.mjs --symbol BNB --days 90` with CMC_API_KEY.
```

## Signal definitions

| Signal | Meaning |
|--------|---------|
| **ENTER_LONG** | A/A+ tier — tactical long permitted |
| **HOLD** | No edge — stay flat; clamp agent BUY |
| **EXIT** | Close long — momentum broken |
| **AVOID** | Rug/macro/structure failure — block entry |

## Error handling

**If `search_cryptos` fails:** Cannot proceed without CMC id. Ask user to verify symbol.

**If `get_crypto_quotes_latest` fails:** Retry once. Without quotes, gate cannot run.

**If `get_crypto_technical_analysis` fails:** Use RSI=50, MACD=neutral; note degraded mode in output gaps.

**If `get_global_metrics_latest` fails:** Use fearGreed=50; note macro check unavailable.

**If rate limited (429):** Inform user, wait, retry with fewer tools.

## Backtestability

- Full spec: [`STRATEGY_SPEC.md`](./STRATEGY_SPEC.md)
- Output schema: [`OUTPUT_SCHEMA.json`](./OUTPUT_SCHEMA.json)
- Engine: [`../../engine/nexus-gate.mjs`](../../engine/nexus-gate.mjs)
- Demo: https://trader-arc.vercel.app/bnb

## Important

- Research tool, not financial advice
- Uses **CMC-native MCP fields** — required for Agent Hub special prize
- Extended DEX flow/liquidity overlays optional when BSC on-chain data available

## BNB Hack alignment

- **Track:** Strategy Skills (CoinMarketCap) — backtestable spec, no live execution required
- **Product:** MERIDIAN NEXUS agent desk — https://trader-arc.vercel.app/nexus
- **Repo:** https://github.com/ibrahim0-cursor/cursor-arc-circle (`bnb-hack/`)
