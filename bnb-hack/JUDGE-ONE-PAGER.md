# MERIDIAN — Judge One-Pager (Track 2)

**Track:** BNB Hack · Strategy Skills (CoinMarketCap)  
**Team:** MERIDIAN · @Meridian_AIO  
**Live demo:** https://trader-arc.vercel.app/gate  
**Full submission:** [`SUBMIT.md`](./SUBMIT.md)

---

## 30-second pitch (read this first)

> We built a **CoinMarketCap Strategy Skill** that turns live market data into a **backtestable STRATEGY_SPEC** — Quantopian-style rules for crypto, not a live-trading bot. Eight deterministic skills feed a Constitution engine; the same rules run in the **public API**, the **CLI**, and the **90-day replay**. On-chain BSC Testnet swaps are optional bonus proof, not the Track 2 requirement.

---

## What judges score (Track 2)

| Hack ask | Where to verify |
|----------|-----------------|
| CMC Skill (LLM-authored) | [`skills/nexus-momentum-gate/SKILL.md`](./skills/nexus-momentum-gate/SKILL.md) |
| Backtestable strategy spec | [`skills/nexus-momentum-gate/STRATEGY_SPEC.md`](./skills/nexus-momentum-gate/STRATEGY_SPEC.md) |
| Reproducible engine | [`engine/nexus-gate.mjs`](./engine/nexus-gate.mjs) · [`backtest/run.mjs`](./backtest/run.mjs) |
| Live proof | curl below · UI **Rules** + **Replay** tabs |

**Not required for Track 2:** wallet connect, NEXUS meme terminal, live DEX execution. (We have Chapel testnet as optional — see end.)

---

## 2-minute demo — click path only

Follow this order. Do **not** start on NEXUS or wallet screens.

| Time | Click | Say |
|------|-------|-----|
| 0:00 | GitHub → `SKILL.md` + `STRATEGY_SPEC.md` | “Skill + spec = deliverable. Default state is FLAT until rules clear.” |
| 0:20 | https://trader-arc.vercel.app/gate → tab **Rules & spec #4** | “Live CMC bar: 8 skills, constitution checks, entry/exit rules.” |
| 0:45 | Tab **90-day replay #5** → run replay if needed | “Same engine as CLI — constitution vs naive agent, equity curve.” |
| 1:10 | Tab **Overview #1** → pick horizon (Scalp / Swing / Position) | “Horizon read from live CMC % moves; execution permit shown separately.” |
| 1:30 | Tab **Technical & reasoning #3** → Timeframe desk | “Live vs planned labels — no fake micro bars claimed as klines.” |
| 1:50 | Tab **Market Memory #2** → Twin card | “Reference library only — not a live forecast.” |
| 2:00 | *(Optional)* Overview → collapsed **Wallet settlement** | “Bonus: wallet-signed PancakeSwap on BSC Testnet — not scored for Track 2.” |

---

## Reproduce in terminal (60 seconds)

Paste in any shell — output must match the desk.

```bash
# Submission metadata + symbols
curl -s "https://trader-arc.vercel.app/api/gate/status" | head -c 400

# Live constitution + 8 skills (pick any benchmark)
curl -s "https://trader-arc.vercel.app/api/gate/evaluate?symbol=CAKE"
curl -s "https://trader-arc.vercel.app/api/gate/skills?symbol=BNB"

# Unified intelligence envelope (memory + court + provenance)
curl -s "https://trader-arc.vercel.app/api/meridian/intelligence?symbol=CAKE"

# 90-day backtest (same engine as npm CLI)
curl -s "https://trader-arc.vercel.app/api/gate/backtest?symbol=BNB&days=90"
```

Local clone (judges with repo):

```bash
npm install
npm run bnb:backtest -- --symbol BNB --days 90
npm run bnb:smoke
```

Check `dataSource` / `cmcLive` / `degraded` fields in JSON — we label venue fallback honestly.

---

## When the UI shows HOLD (say this — it is not broken)

Use this script whenever Overview, router pick, or permit looks “stuck”:

> **“HOLD is the strategy default in STRATEGY_SPEC §1 — we do not force LONG for demo excitement. Constitution can score 9/9 while the composite desk and permit stay HOLD in risk-off tape; that is layered evidence, not missing data. Open Rules for today’s bar, Replay for 90-day proof, or curl `/api/gate/evaluate` — the signal is reproducible, not cosmetic.”**

Three layers (point at Overview pills):

| Layer | Meaning | Judge check |
|-------|---------|-------------|
| **Horizon signal** | Live CMC % move for *your* timeframe (Scalp → Position) | Changes when you click horizon pills |
| **Constitution** | Today’s rule pass/fail (A/A+ → ENTER_LONG) | Rules tab · `gate.signal` in API |
| **Permit / execution router** | Chapel gate — GRANT only when full stack clears | `permit` in API · often DENY in F&G ~20s |

If `gate.signal` is `ENTER_LONG` but UI hero is HOLD: **intentional** — composite + permit stricter than raw constitution. Track 2 scores the **spec + backtest**, not “always green buttons.”

---

## Four criteria — one line each

| Criterion | MERIDIAN answer |
|-----------|-----------------|
| **Technical execution** | Deterministic engine + public APIs + CLI backtest; CMC live when keyed; proxies labeled. |
| **Originality** | Constitution + Bull/Bear Court + memory OS — not another RSI widget. |
| **Real-world relevance** | Pre-trade gate for CMC Agent Hub / agents sizing on BSC benchmarks. |
| **Demo & presentation** | This page + [`SUBMIT.md`](./SUBMIT.md) script — stay on `/gate` Rules → Replay. |

---

## Do NOT click on demo day

- **NEXUS** as the product story (meme terminal — out of scope)
- **Wallet / Buy / Autopilot** as the opening (Track 2 is strategy spec, not live agent)
- **Analytics** as substitute for Rules/Replay (traction bonus only)

---

## Links (copy-paste for forms)

| Field | URL |
|-------|-----|
| Live demo | https://trader-arc.vercel.app/gate |
| GitHub skill | https://github.com/ibrahim0-cursor/cursor-arc-circle/tree/main/bnb-hack/skills/nexus-momentum-gate |
| Architecture | https://github.com/ibrahim0-cursor/cursor-arc-circle/blob/main/docs/MERIDIAN-TRACK2.md |
| Analytics (optional) | https://trader-arc.vercel.app/analytics |
| Dune (on-chain SQL) | https://dune.com/queries/7760806 · https://dune.com/queries/7760807 |

---

## Submission compliance

| Rule | Status |
|------|--------|
| Public repo + demo link | ✅ |
| Reproducible setup (`npm run bnb:backtest`, curl) | ✅ |
| No token launch / airdrop during event | ✅ |
| On-chain agent address (Track **1** only) | N/A — optional Chapel testnet bonus |
| AI tooling | ✅ Skill + deterministic engine |

---

*Aligned with [`SUBMIT.md`](./SUBMIT.md) demo script. For deep architecture, see [`docs/MERIDIAN-TRACK2.md`](../docs/MERIDIAN-TRACK2.md).*
