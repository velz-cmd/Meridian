# MERIDIAN — Market Intelligence OS

**Turn market data into backtestable strategy.**

MERIDIAN is a CoinMarketCap-powered market intelligence desk for **BNB Hackathon Track 2 (Strategy Skills)**. Eight deterministic CMC skills feed Bull/Bear Court and Constitution — producing auditable verdicts, historical replay, and optional BSC testnet execution.

| Module | Purpose |
|--------|---------|
| **Strategy** (`/gate`) | CMC Strategy Skill desk — live evaluation, rules, 90-day replay |
| **NEXUS** (`/nexus`) | Trading terminal — wallet, swaps, agent console |
| **PRISM** (`/prism`) | Macro intelligence — under development |

## Live

- **Production:** https://trader-arc.vercel.app
- **Strategy desk:** https://trader-arc.vercel.app/gate
- **Analytics:** https://trader-arc.vercel.app/analytics

## Track 2 deliverables

| Layer | Location |
|-------|----------|
| **Product UI** | [/gate](https://trader-arc.vercel.app/gate) |
| **Live evaluation** | `GET /api/gate/evaluate?symbol=BNB` |
| **Skills API** | `GET /api/gate/skills?symbol=CAKE` |
| **90-day backtest** | `GET /api/gate/backtest?symbol=BNB&days=90` |
| **Intelligence API** | `GET /api/meridian/intelligence?symbol=CAKE` |
| **CMC Skill** | [`bnb-hack/skills/nexus-momentum-gate/SKILL.md`](bnb-hack/skills/nexus-momentum-gate/SKILL.md) |
| **Strategy spec** | [`bnb-hack/skills/nexus-momentum-gate/STRATEGY_SPEC.md`](bnb-hack/skills/nexus-momentum-gate/STRATEGY_SPEC.md) |
| **Submission guide** | [`bnb-hack/SUBMIT.md`](bnb-hack/SUBMIT.md) |
| **Judge one-pager** | [`bnb-hack/JUDGE-ONE-PAGER.md`](bnb-hack/JUDGE-ONE-PAGER.md) |

**Judge demo path:** Open `/gate` → Overview + Rules → 90-day Replay → reproduce via curl.

```bash
curl "https://trader-arc.vercel.app/api/gate/evaluate?symbol=BNB"
curl "https://trader-arc.vercel.app/api/gate/skills?symbol=CAKE"
npm run bnb:backtest -- --symbol BNB --days 90
```

## Intelligence stack

```
CMC APIs → 8 Skills (evidence) → Bull/Bear Court → Constitution → Memory → Verdict
```

Golden rules: never hallucinate, prefer WAIT over fake certainty, skills provide evidence only — never BUY/SELL.

Full architecture: [`docs/MERIDIAN-TRACK2.md`](docs/MERIDIAN-TRACK2.md)

## Quick start

```bash
npm install
cp .env.example .env.local
# Add CMC_API_KEY (required for live Gate data)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment

Copy `.env.example` to `.env.local`. **Required for Strategy desk:**

| Variable | Purpose |
|----------|---------|
| `CMC_API_KEY` | CoinMarketCap quotes, fear/greed, global metrics |
| `CMC_MCP_API_KEY` | CMC MCP tools (optional, same key often works) |

**Optional — NEXUS / PRISM / execution:**

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | NEXUS decision engine |
| `ANTHROPIC_API_KEY` | PRISM forecasting |
| `NEWS_API_KEY` | NewsAPI headlines |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Wallet connect |

Without API keys, Gate shows honest DATA UNAVAILABLE states. NEXUS runs in heuristic demo mode using DexScreener + GDELT.

## Scripts

```bash
npm run dev              # Local dev server
npm run build            # Production build
npm run health           # Health check (production)
npm run health:local     # Health check (localhost)
npm run bnb:backtest     # 90-day constitution backtest
npm run bnb:smoke        # Engine smoke test (no API key)
npm run bnb:evaluate     # CLI evaluation
```

## Deploy to Vercel

1. Push to [github.com/ibrahim0-cursor/cursor-arc-circle](https://github.com/ibrahim0-cursor/cursor-arc-circle)
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add environment variables from `.env.example` — **`CMC_API_KEY` is required**
4. Deploy — Next.js auto-detected, root `/`

### Supabase (optional persistence)

1. Run SQL in `supabase/schema.sql`
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
3. Verify: `npm run health` — `demoPortfolio.tableOk` should be `true`

## Submission checklist (BNB Hack Track 2)

- [ ] Public GitHub repo with `SKILL.md` + `STRATEGY_SPEC.md`
- [ ] Live `/gate` loads; Rules + Replay work
- [ ] Demo video follows judge path (Strategy-first, not NEXUS-first)
- [ ] Vision text says backtestable spec, not "AI trading agent"
- [ ] Category = No for AI Agent
- [ ] Logo uploaded (480×480) — `public/meridian-logo-480.png`

## Repository

[github.com/ibrahim0-cursor/cursor-arc-circle](https://github.com/ibrahim0-cursor/cursor-arc-circle)

Built for **BNB Hackathon · Strategy Skills (CoinMarketCap) · 2026**
