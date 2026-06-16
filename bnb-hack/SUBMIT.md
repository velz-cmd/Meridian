# BNB Hack Track 2 — Submission Guide

**Deadline:** June 21, 2026, 20:00 UTC  
**Track:** Strategy Skills (CoinMarketCap) — $6,000 (3 winners)  
**Project name:** NEXUS Momentum Gate  
**Team:** MERIDIAN (@Meridian_AIO)

---

## What judges explicitly want (Track 2)

From [BNB Hack: AI Trading Agent Edition](https://dorahacks.io/hackathon/bnbhack-twt-cmc/):

| Requirement | How we satisfy it |
|-------------|-------------------|
| **Build a CMC Skill** that turns market data into a trading strategy | `skills/nexus-momentum-gate/SKILL.md` — official frontmatter + MCP workflow |
| **Backtestable strategy spec** (no live execution required) | `STRATEGY_SPEC.md` — Quantopian-style rules, metrics, position mgmt |
| **GitHub link required** | `bnb-hack/` folder in repo |
| **Reproducible** with clear setup | `npm run bnb:smoke`, `npm run bnb:backtest`, README |
| **Judged on technical execution, originality, real-world relevance** | Deterministic engine, agent veto layer, structured JSON schema, live NEXUS product lineage |
| **No token launches / fundraising** | Strategy spec only — no execution |

**Special prize — Best Use of Agent Hub ($2k):** Multi-tool MCP workflow (quotes + TA + global metrics + optional holder metrics), structured output for agent chaining.

---

## DoraHacks BUIDL form

| Field | Value |
|-------|-------|
| **Project title** | NEXUS Momentum Gate — CMC Agent Conviction Skill |
| **Tagline** | Pre-trade veto layer: clamps agent BUY to backtestable ENTER_LONG gates via CMC MCP |
| **GitHub** | https://github.com/ibrahim0-cursor/cursor-arc-circle (folder: `bnb-hack/`) |
| **Demo URL** | https://trader-arc.vercel.app/nexus — **Conviction Constitution** panel (CMC + agent veto) |
| **Track** | Strategy Skills |
| **Video** | ≤3 min — Skill workflow + backtest metrics + agent veto demo |

---

## Pitch (30 seconds)

NEXUS Momentum Gate is **not another “research this coin” skill**. It is an **agent-grade pre-trade conviction system** — the same statistical bar our live NEXUS desk uses to clamp AI BUY signals. Via CoinMarketCap MCP, it fuses quotes, RSI/MACD, Fear & Greed, and rug-pattern detection into weighted gate checks, emits structured JSON for agent chaining, and ships a **Quantopian-style backtest** with drawdown and win rate. Autonomous agents get a constitution before they size.

---

## What judges should verify

1. **CMC Skill format** — YAML frontmatter matches [official template](https://github.com/coinmarketcap-official/skills-for-ai-agents-by-CoinMarketCap); correct tool names (`get_global_metrics_latest`, not deprecated names)
2. **Unique use case** — pre-trade veto / agent conviction gate (see `enforceAgentGate`)
3. **Backtestable spec** — `STRATEGY_SPEC.md` §8 with metrics table
4. **Runnable engine** — `npm run bnb:smoke` (exit 0) · `npm run bnb:backtest`
5. **Structured output** — `OUTPUT_SCHEMA.json` + `evaluate.mjs`
6. **Demo** — https://trader-arc.vercel.app/bnb or terminal JSON
7. **Live product context** — NEXUS desk at `/nexus` (strategy brain origin)

---

## Video script outline (≤3 min)

1. **Problem** (20s): Autonomous agents over-trade on raw LLM BUY signals — need reproducible veto layer.
2. **Skill demo** (60s): CMC MCP → `nexus-momentum-gate` on BNB → gate checks + tier + `agentDirective`.
3. **Agent veto** (30s): `npm run bnb:evaluate` with `--enforce '{"action":"BUY"}'` → clamped to HOLD.
4. **Backtest** (45s): `npm run bnb:backtest` → return, max drawdown, win rate JSON.
5. **NEXUS desk** (45s): `/nexus` → select BNB → **Conviction Constitution** panel → agent BUY vs veto.
6. **Close** (15s): Open source, MIT, Agent Hub ready.

---

## Pre-submit commands (PowerShell)

```powershell
npm run bnb:smoke
npm run bnb:backtest
npm run bnb:evaluate

# Live CMC backtest (requires Pro API key):
$env:CMC_API_KEY = "your_key"
node bnb-hack/backtest/run.mjs --symbol BNB --days 90
node bnb-hack/backtest/run.mjs --symbol CAKE --days 90 --write-report
```

---

## Do NOT emphasize in BNB submission

- Arc / Agora / x402 payment flows  
- CyOps / Promise Desk  
- Live BSC execution (Track 1 scope)

---

## Blockers for judges

| Blocker | Workaround |
|---------|------------|
| No CMC API key | Fixture backtest runs offline (`npm run bnb:backtest`) |
| MCP not configured | Demo page + engine CLI still work; Skill needs MCP for live agent calls |

---

## After submit

- Monitor DoraHacks Discord for judge questions  
- Keep `bnb-hack/` aligned if CMC Skill schema changes
