# BNB Hack Track 2 — MERIDIAN Constitution Permit

**Deadline:** June 21, 2026, 20:00 UTC  
**Track:** Strategy Skills (CoinMarketCap)  
**Team:** MERIDIAN (@Meridian_AIO)

---

## One sentence (what wins among 1000)

**Trading agents don't need another coin screener — they need a constitution that GRANTs or DENYs execution, with CMC-backed rules, counterfactual proof, and a live runtime on NEXUS.**

---

## Why we're not another checklist app

| Typical submission | MERIDIAN |
|--------------------|----------|
| Static CMC screener | **Runtime permit API** agents call before sizing |
| Research-only skill | **GRANT/DENY enforcement** — buy button blocked on DENY |
| Backtest in a README | **Counterfactual panel** on live desk (naive agent vs constitution) |
| Demo on a `/bnb` side page | **Flagship on `/nexus`** — judges land on production product |
| Skill without version proof | **Verifiable skill metadata** (id, version, spec hash) in every permit |

**Two-layer safety story:** Constitution gate (CMC Strategy Skill) + optional MetaMask Agent Wallet execution guard.

---

## Product (not a checklist page)

| Layer | What it is |
|-------|------------|
| **Live product** | https://trader-arc.vercel.app/nexus → Constitution desk on every token |
| **Real loop** | Pick BNB/CAKE (live prices) → agent BUY → CMC permit → buy blocked if DENY |
| **Runtime API** | `POST /api/constitution/permit` → GRANT/DENY receipt (agents call this) |
| **Health API** | `GET /api/constitution/status` → CMC live + skill metadata |
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
| Live demo | `/nexus` — live CMC + regime gate + enforcement (no scripted slideshow) |

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

## 2-minute video script (judge demo)

1. **Open** https://trader-arc.vercel.app/nexus (0:00)
2. **Pick BNB** from constitution start cards — live price loads (0:15)
3. **Show** agent BUY → constitution evaluates with CMC live strip (0:30)
4. **Show** DENY/GRANT + regime badge + failed gate checks (0:45)
5. **Click Buy** — blocked when constitution DENYs (1:00)
6. **Scroll** counterfactual — live-calibrated backtest from CMC anchor (1:15)
7. **Click** Compare BNB vs CAKE — two real permit API calls (1:30)
8. **Copy** full receipt + terminal curl (1:45)

---

## Judge commands

```powershell
# Constitution health (CMC + skill)
curl https://trader-arc.vercel.app/api/constitution/status

# Permit API (Track 2 runtime)
curl -X POST https://trader-arc.vercel.app/api/constitution/permit ^
  -H "Content-Type: application/json" ^
  -d "{\"symbol\":\"BNB\",\"agent\":{\"action\":\"BUY\",\"confidence\":92}}"

# Engine + backtest
npm run bnb:smoke
npm run bnb:backtest
```

---

## Judge walkthrough (live UI)

1. Land on `/nexus` — amber **BNB Hack** banner visible
2. No token? Pick **BNB** or **CAKE** from hackathon demo cards
3. Or click **Run Hackathon Demo** — auto-selects BNB and scrolls to the constitution desk
4. Constitution desk shows: CMC live · skill id · permit id · dataSource strip
5. Trade panel → Buy → **Constitution DENY — buy blocked** when vetoed
6. Copy **Full receipt** (permit + counterfactual + skill meta) for inspection

---

## Do NOT pitch

- Arc / Agora payment flows  
- Generic “research this coin”  
- Separate `/bnb` demo page (redirects to NEXUS)
