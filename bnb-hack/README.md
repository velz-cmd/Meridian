# BNB Hack — Track 2: MERIDIAN Gate

**MERIDIAN** submission for [BNB Hack: AI Trading Agent Edition](https://dorahacks.io/hackathon/bnbhack-twt-cmc/) — **Strategy Skills** track.

**Product:** https://trader-arc.vercel.app/gate

---

## Unique use case

**Agent-grade pre-trade conviction gate** — CoinMarketCap-backed weighted checks before an AI agent sizes in. Live evaluation + real historical backtest. No synthetic counterfactual in public API.

---

## Artifacts

| Artifact | Path |
|----------|------|
| CMC Skill | `skills/nexus-momentum-gate/SKILL.md` |
| Strategy spec | `skills/nexus-momentum-gate/STRATEGY_SPEC.md` |
| Engine | `engine/nexus-gate.mjs` |
| Historical runner | `live/run-backtest.mjs` |
| Backtest CLI | `backtest/run.mjs` |
| Web product | `/gate` |

---

## Judge commands

```powershell
curl https://trader-arc.vercel.app/api/gate/status
curl "https://trader-arc.vercel.app/api/gate/evaluate?symbol=BNB"
curl "https://trader-arc.vercel.app/api/gate/backtest?symbol=BNB&days=90"
npm run bnb:backtest -- --symbol BNB --days 90
```

---

## Data policy

- **Live `/gate`:** CoinMarketCap quotes + fear/greed only (BNB/CAKE)
- **Backtest:** CMC historical daily — returns honest error if plan/key missing
- **Fixtures:** offline CLI smoke only (`bnb:smoke` without key) — never in `/api/gate/*`

See [`SUBMIT.md`](./SUBMIT.md)
