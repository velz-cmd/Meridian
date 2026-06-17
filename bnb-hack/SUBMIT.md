# BNB Hack Track 2 — MERIDIAN Gate

**Deadline:** June 21, 2026, 20:00 UTC  
**Track:** Strategy Skills (CoinMarketCap)  
**Team:** MERIDIAN (@Meridian_AIO)

---

## One sentence

**MERIDIAN BSC Capital Router — ranks BNB vs CAKE under a fixed constitution, issues auditable GRANT/DENY permits, and proves regime discipline on real CoinMarketCap history.**

---

## Demo (judges start here)

| What | URL |
|------|-----|
| **Product** | https://trader-arc.vercel.app/gate |
| **Capital route** | `GET /api/gate/route` |
| **Permit evaluate** | `GET /api/gate/evaluate?symbol=BNB` |
| **Historical proof** | `GET /api/gate/backtest?symbol=BNB&days=90` |
| **Health** | `GET /api/gate/status` |
| **CMC Skill** | `bnb-hack/skills/nexus-momentum-gate/SKILL.md` |
| **GitHub** | https://github.com/ibrahim0-cursor/cursor-arc-circle |

---

## Data integrity policy

| Rule | Implementation |
|------|----------------|
| Live fields from CMC only on `/gate` | `fetchGateSnapshot()` — quotes + fear/greed |
| RSI on gate path | 14-period from CMC historical daily when available; proxy labeled in `fieldSources` |
| Backtest | `runHistoricalBacktest()` — CMC historical daily only |
| No fixture in public API | `/api/gate/backtest` returns 503 + honest error if plan/key missing |
| Fixtures | CLI offline only (`npm run bnb:smoke` without key) — not used in judge UI |

---

## Track 2 checklist

| Requirement | Deliverable |
|-------------|-------------|
| CMC Skill → strategy | `SKILL.md` + `STRATEGY_SPEC.md` |
| Backtestable | `engine/nexus-gate.mjs` + `live/run-backtest.mjs` |
| GitHub | `bnb-hack/` |
| Reproducible | `npm run bnb:backtest -- --symbol BNB --days 90` |
| Live demo | `/gate` — BNB/CAKE only |

---

## 2-minute video script

1. Open **https://trader-arc.vercel.app/gate** (0:00)
2. Select **BNB** — live CMC price + gate checks (0:20)
3. Show **GRANT/DENY** + failed checks (0:40)
4. Scroll **90-day backtest** — constitution vs naive agent (0:55)
5. If backtest unavailable: show honest error + CLI reproduce (1:10)
6. Open **SKILL.md** on GitHub (1:25)
7. Terminal: `curl .../api/gate/evaluate?symbol=BNB` (1:45)

---

## Judge commands

```powershell
curl https://trader-arc.vercel.app/api/gate/status
curl https://trader-arc.vercel.app/api/gate/route
curl "https://trader-arc.vercel.app/api/gate/evaluate?symbol=BNB&agentAction=BUY&confidence=92"
curl "https://trader-arc.vercel.app/api/gate/backtest?symbol=BNB&days=90"
npm run bnb:backtest -- --symbol BNB --days 90
```

---

## DoraHacks BUIDL

| Field | Value |
|-------|--------|
| **Title** | MERIDIAN Gate — CMC Strategy Skill for Agent Pre-Trade Conviction |
| **Tagline** | Live CoinMarketCap gate + real historical backtest for BNB Smart Chain agents |
| **Demo** | https://trader-arc.vercel.app/gate |
| **Track** | Strategy Skills |

---

## Do NOT pitch on demo day

- NEXUS terminal as the product (supporting app only)
- Meme coins / dex overlay tokens
- Synthetic backtest or counterfactual in permit JSON
- Arc / PRISM (different hackathons)
