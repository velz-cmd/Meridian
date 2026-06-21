# MERIDIAN — BUIDL submission copy

Use this when filling the hackathon / BUIDL form.

---

## BUIDL name

```
MERIDIAN
```

## Is this an AI Agent?

```
No
```

## Vision (paste into form)

Most crypto tools show buy/sell labels with no rules, no backtest, and no honest answer when the right move is to wait. MERIDIAN fixes that by turning live CoinMarketCap data into a backtestable strategy spec: eight deterministic skills, a Constitution permit gate, Bull vs Bear evidence, and a 90-day replay that uses the same engine as the public API and CLI. The Strategy desk shows actionable states (accumulate, wait, reduce, exit), separates price horizon from entry permit, and prefers WAIT over fake certainty. Optional BSC testnet settlement proves rules can execute; the core deliverable is SKILL.md + STRATEGY_SPEC.md + reproducible backtest.

---

## Project description (longer — if form has extra field)

MERIDIAN is a CoinMarketCap-powered market intelligence desk for Track 2 (Strategy Skills).

**Problem:** Traders and researchers rarely get explicit entry/exit rules, reproducible backtests, or transparent reasoning when conditions are mixed. Most “signals” optimize for excitement, not decision quality.

**Solution:** An LLM-authored CMC Skill (`SKILL.md`) plus a machine-readable strategy spec (`STRATEGY_SPEC.md`) drive a deterministic engine: momentum, sentiment, regime, trend, liquidity, structure, relative strength, and volatility feed weighted Bull vs Bear Court debate and a nine-check Constitution. The same logic runs in GitHub, REST APIs, CLI backtest, and the live Strategy desk at `/gate`.

**Tabs (one symbol, one pipeline):**
1. **Overview** — horizon desk state, permit, conviction, court summary, four pillars  
2. **Market Memory** — historical analog reference (not live forecast)  
3. **Technical & Reasoning** — multi-timeframe evidence and chambers  
4. **Rules & Spec** — constitution checks, skill stack, reproduce curl/CLI  
5. **90-day Replay** — constitution vs naive agent, equity curve  

**Utility:** Researchers reproduce via curl; swing traders read horizon states and permit; execution is optional on BSC Testnet when GRANT clears.

**Links:** https://github.com/ibrahim0-cursor/cursor-arc-circle · https://trader-arc.vercel.app/gate · https://x.com/Meridian_AIO

---

## 60-second demo voiceover script

> [0:00] MERIDIAN turns live CoinMarketCap data into a backtestable strategy — not another black-box signal.
>
> [0:08] On the Strategy desk, live CMC feeds eight deterministic skills. The Overview shows desk state by horizon — scalp, day trade, swing, position — and a separate permit gate so price trend and entry rules never pretend to be the same thing.
>
> [0:22] Bull versus Bear Court aggregates evidence into scores and conflict — not raw layer noise. Market Memory matches today to historical episodes as reference only, not prediction.
>
> [0:35] Rules and Spec is the judge path: constitution checks, data provenance, and the same endpoints you can curl from terminal.
>
> [0:45] Ninety-day Replay runs the identical engine as the CLI — constitution versus a naive agent, with real win rate and drawdown on the screen.
>
> [0:55] GitHub holds SKILL.md and STRATEGY_SPEC.md. Same rules everywhere. WAIT is valid when there is no edge. MERIDIAN — trust is the product.

---

## Pre-submit checklist

| Item | Status |
|------|--------|
| GitHub public: SKILL.md | ✅ `bnb-hack/skills/nexus-momentum-gate/SKILL.md` |
| GitHub public: STRATEGY_SPEC.md | ✅ `bnb-hack/skills/nexus-momentum-gate/STRATEGY_SPEC.md` |
| Live /gate loads | ✅ https://trader-arc.vercel.app/gate (HTTP 200) |
| Gate API live | ✅ `/api/gate/status` |
| Demo video (Gate tabs) | ✅ `artifacts/meridian-gate-track2-demo.mp4` |
| Vision = backtestable spec | ✅ copy above |
| Category AI Agent = No | ✅ |
| Logo 480×480 PNG | ✅ `public/meridian-logo-480.png` (generate before upload) |

---

## Demo video upload

1. Upload `meridian-gate-track2-demo.mp4` to YouTube (unlisted or public).
2. Paste URL in **Demo video** field.

Recommended title: **MERIDIAN — CMC Strategy Desk (Track 2 Demo)**
