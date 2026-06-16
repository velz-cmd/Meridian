# BNB Hack — Track 2: NEXUS Momentum Gate

**MERIDIAN** submission for [BNB Hack: AI Trading Agent Edition](https://dorahacks.io/hackathon/bnbhack-twt-cmc/) — **Strategy Skills** track ($6k) + **Best Use of Agent Hub** ($2k).

Live product: [NEXUS desk](https://trader-arc.vercel.app/nexus) · Judge demo: [/bnb](https://trader-arc.vercel.app/bnb)

---

## Unique use case

**Agent-grade pre-trade conviction gate** — not generic coin research. Clamps upstream AI BUY signals to statistically rare **ENTER_LONG** events using the same weighted discipline as live NEXUS (`src/lib/signal-gate.ts`).

---

## Artifacts

| Artifact | Path |
|----------|------|
| CMC Skill (installable) | `skills/nexus-momentum-gate/SKILL.md` |
| Strategy specification | `skills/nexus-momentum-gate/STRATEGY_SPEC.md` |
| JSON output schema | `skills/nexus-momentum-gate/OUTPUT_SCHEMA.json` |
| Reference engine | `engine/nexus-gate.mjs` |
| Backtest runner | `backtest/run.mjs` |
| MCP config example | `mcp-config.example.json` |
| Web demo | `/bnb` (trader-arc) |

**Not live execution** — Track 2 requires strategy + CMC Skill + backtestability.

---

## Quick start (PowerShell)

```powershell
npm run bnb:smoke
npm run bnb:backtest
npm run bnb:evaluate
```

### Live CMC backtest

```powershell
$env:CMC_API_KEY = "your_pro_api_key"
node bnb-hack/backtest/run.mjs --symbol BNB --days 90
```

### Agent veto demo

```powershell
node bnb-hack/evaluate.mjs --enforce '{"action":"BUY","confidence":90,"reasoning":"LLM wants buy"}' < snapshot.json
```

Or pipe a snapshot:

```powershell
'{"symbol":"BNB","price":650,"marketCap":96e9,"volume24h":1.9e9,"change1h":0.8,"change24h":4.5,"change7d":14,"rsi":58,"macdSignal":"bullish","fearGreed":62}' | node bnb-hack/evaluate.mjs
```

---

## CMC MCP tools used

Aligned with [official CMC skills repo](https://github.com/coinmarketcap-official/skills-for-ai-agents-by-CoinMarketCap):

- `search_cryptos`
- `get_crypto_quotes_latest`
- `get_crypto_technical_analysis`
- `get_global_metrics_latest` (Fear & Greed index)
- `get_crypto_metrics` (optional holder overlay)

---

## Backtest metrics

`totalReturnPct`, `maxDrawdownPct`, `winRatePct`, `roundTrips`, `avgWinPct`, `avgLossPct`

---

## Submission checklist

See [`SUBMIT.md`](./SUBMIT.md)

---

## License

MIT — same as MERIDIAN trader-arc project.
