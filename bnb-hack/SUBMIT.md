# BNB Hack Track 2 — MERIDIAN Momentum Constitution

**Deadline:** June 21, 2026, 20:00 UTC  
**Track:** Strategy Skills (CoinMarketCap)  
**Team:** MERIDIAN (@Meridian_AIO)

---

## What judges asked for

> Build a CMC Skill that turns market data into a trading strategy. Your deliverable is a **backtestable strategy spec**, not a live-trading agent. Think **Quantopian-style strategy generation**, adapted to crypto and authored as an **LLM Skill**.

We deliver exactly that. No execution layer required.

---

## One sentence

**A CoinMarketCap LLM Skill that transforms live market data (quotes, RSI, MACD, Fear & Greed) into explicit entry/exit rules — with a reproducible 90-day backtest on the same engine.**

---

## Deliverables (submission checklist)

| Required | Path |
|----------|------|
| **CMC Skill (LLM-authored)** | `bnb-hack/skills/nexus-momentum-gate/SKILL.md` |
| **Backtestable strategy spec** | `bnb-hack/skills/nexus-momentum-gate/STRATEGY_SPEC.md` |
| **Agent prompt** | `bnb-hack/skills/nexus-momentum-gate/PROMPT.md` |
| **Output schema** | `bnb-hack/skills/nexus-momentum-gate/OUTPUT_SCHEMA.json` |
| **Strategy engine** | `bnb-hack/engine/nexus-gate.mjs` |
| **Backtest runner** | `bnb-hack/backtest/run.mjs` |
| **Live demo (optional UI)** | https://trader-arc.vercel.app/gate |
| **Public analytics** | https://trader-arc.vercel.app/analytics |
| **Analytics API** | `GET /api/bnb/analytics` |

---

## Demo (2-minute video script)

1. Open **https://trader-arc.vercel.app/gate** — “market data → strategy” (0:00)
2. Show **entry / exit / position rules** on page (0:15)
3. Toggle **BNB** — today’s strategy output: LONG or FLAT + thesis (0:30)
4. Scroll **90-day backtest** — strategy vs naive agent (0:50)
5. GitHub **SKILL.md** — CMC MCP workflow (1:10)
6. GitHub **STRATEGY_SPEC.md** — Quantopian-style rules (1:25)
7. Terminal: `npm run bnb:backtest -- --symbol BNB --days 90` (1:45)

---

## Reproduce

```powershell
curl "https://trader-arc.vercel.app/api/gate/evaluate?symbol=BNB"
curl "https://trader-arc.vercel.app/api/gate/backtest?symbol=BNB&days=90"
npm run bnb:backtest -- --symbol BNB --days 90
```

---

## Data policy

- Live strategy uses **CoinMarketCap only** (quotes + fear/greed; RSI from historical daily when plan allows).
- Backtest uses CMC historical daily bars when available; **Binance venue replay** as honest fallback on Basic tier — labeled in API response.
- **No synthetic fixtures** in public judge APIs.

---

## DoraHacks BUIDL

| Field | Value |
|-------|--------|
| **Title** | MERIDIAN Momentum Constitution — CMC Strategy Skill |
| **Tagline** | CoinMarketCap data → entry/exit rules → Quantopian-style backtest |
| **Demo** | https://trader-arc.vercel.app/gate |
| **Track** | Strategy Skills |

---

## Do NOT lead with on demo day

- Live trading / wallet / DEX execution (not required for Track 2)
- RSI dashboards or indicator tabs
- Meme coin terminal (NEXUS) as the product story
