# BNB Hack Track 2 — MERIDIAN Constitution Permit

**Deadline:** June 21, 2026, 20:00 UTC  
**Track:** Strategy Skills (CoinMarketCap)  
**Team:** MERIDIAN (@Meridian_AIO)

---

## One sentence (what wins among 1000)

**Trading agents don't need another coin screener — they need a constitution that GRANTs or DENYs execution, with CMC-backed rules, counterfactual proof, and a live runtime on NEXUS.**

---

## Product (not a checklist page)

| Layer | What it is |
|-------|------------|
| **Live product** | https://trader-arc.vercel.app/nexus → **Constitution Permit** desk on every token |
| **Runtime API** | `POST /api/constitution/permit` → GRANT/DENY receipt (agents call this) |
| **CMC Skill** | `bnb-hack/skills/nexus-momentum-gate/SKILL.md` — installable Agent Hub skill |
| **Backtest proof** | Naive agent vs constitution side-by-side (drawdown saved, return delta) |
| **Execution hook** | Buy button **blocked** when constitution DENYs — daily use |

---

## Track 2 checklist

| Requirement | Deliverable |
|-------------|-------------|
| CMC Skill → trading strategy | `SKILL.md` + `STRATEGY_SPEC.md` |
| Backtestable | `engine/nexus-gate.mjs` + `backtestCompare()` |
| GitHub | `bnb-hack/` in repo |
| Reproducible | `npm run bnb:smoke` · curl permit API |
| Agent Hub depth | CMC quotes + TA + Fear/Greed + permit JSON schema |

---

## DoraHacks BUIDL

| Field | Value |
|-------|--------|
| **Title** | MERIDIAN Constitution Permit — CMC Strategy Runtime for Trading Agents |
| **Tagline** | Agents request trades; constitution issues GRANT or DENY with backtest proof |
| **Demo** | https://trader-arc.vercel.app/nexus |
| **GitHub** | https://github.com/ibrahim0-cursor/cursor-arc-circle |
| **Track** | Strategy Skills |

---

## 3-minute video script

1. **Problem (20s):** LLM agents over-trade. Everyone ships research bots.
2. **Permit API (30s):** `curl POST /api/constitution/permit` → DENY with receipt JSON.
3. **NEXUS live (90s):** Select BNB → Agent BUY → Constitution **DENY** → Buy button blocked → counterfactual backtest shows naive agent worse drawdown.
4. **Skill (30s):** Same rules in `bnb-hack/SKILL.md` for any agent via CMC MCP.
5. **Close (10s):** MERIDIAN — constitution before capital.

---

## Judge commands

```powershell
# Permit API (Track 2 runtime)
curl -X POST https://trader-arc.vercel.app/api/constitution/permit ^
  -H "Content-Type: application/json" ^
  -d "{\"symbol\":\"BNB\",\"agent\":{\"action\":\"BUY\",\"confidence\":92}}"

# Engine + backtest
npm run bnb:smoke
npm run bnb:backtest
```

---

## Do NOT pitch

- Arc / Agora payment flows  
- Generic “research this coin”  
- Separate `/bnb` demo page (redirects to NEXUS)
