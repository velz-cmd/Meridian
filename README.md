# ARC CIRCLE — Agent Intelligence Suite

Two production-grade AI agents for the **Agora Agents Hackathon** (Circle × Arc):

| Product | Purpose | Stack |
|---------|---------|-------|
| **NEXUS** | Autonomous trading agent | DexScreener · OpenAI · Circle Wallets · Arc anchoring |
| **PRISM** | Macro & geopolitical oracle | GDELT · NewsAPI · Claude · Arc anchoring |

## Live

- **Production:** https://trader-arc.vercel.app
- **Arc Testnet:** chain `5042002` · Circle RPC `https://rpc.testnet.arc.network` · node **[v0.7.1](https://github.com/circlefin/arc-node/releases/tag/v0.7.1)**

## Live routes

- `/` — Landing hub
- `/nexus` — Trading agent console
- `/prism` — Forecasting oracle
- `/arc` — Counter deploy / increment (wallet on Arc testnet)
- `/bnb` — **BNB Hack Track 2** — NEXUS Momentum Gate demo (CMC Strategy Skill)

## BNB Hack — Strategy Skills (Track 2)

**MERIDIAN Gate** — CoinMarketCap Strategy Skill with live evaluation and real historical backtest.

| Layer | Location |
|-------|----------|
| **Product** | [/gate](https://trader-arc.vercel.app/gate) |
| **Live API** | `GET /api/gate/evaluate?symbol=BNB` |
| **Backtest API** | `GET /api/gate/backtest?symbol=BNB&days=90` |
| **CMC Skill** | [`bnb-hack/skills/nexus-momentum-gate/SKILL.md`](bnb-hack/skills/nexus-momentum-gate/SKILL.md) |
| **Submission** | [`bnb-hack/SUBMIT.md`](bnb-hack/SUBMIT.md) |

**Judge demo:** Open `/gate` → BNB live gate → 90-day backtest → reproduce via curl.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment

Copy `.env.example` to `.env.local` and add:

- `OPENAI_API_KEY` — NEXUS decision engine
- `ANTHROPIC_API_KEY` — PRISM forecasting engine
- `NEWS_API_KEY` — NewsAPI headlines (optional but recommended)
- `CIRCLE_API_KEY` — `ENTITY_ID:API_KEY:SECRET` from Circle sandbox
- `CIRCLE_KIT_KEY` — Circle App Kit key
- `ARC_AGENT_PRIVATE_KEY` — optional funded Arc testnet key for on-chain anchors

Without API keys, both agents still run in **heuristic demo mode** using live DexScreener + GDELT data.

## Hackathon alignment

- **Agentic sophistication** — autonomous BUY/SELL/HOLD and probability forecasts
- **Circle usage** — sandbox wallet provisioning + USDC-native agent treasury
- **Arc settlement** — decision payloads anchored on Arc testnet (**v0.7.1**, Circle RPC for reviewable on-chain activity)
- **Traction-ready UI** — premium glass interface built for demo video + live users

**Circle grant referral** (paste into Discord `#circle-grant-referral-requests`): [docs/CIRCLE-GRANT-REFERRAL.md](docs/CIRCLE-GRANT-REFERRAL.md) — formatted like AUREUS / DealARC / AuraPredict submissions

## NEXUS v2 features

- **Contract address** on every token (copy button)
- **Live DexScreener chart** embed per token
- **Birdeye intel**: market cap, snipers, holders, concentration risk
- **Reasoning breakdown**: factor-by-factor why BUY / SELL / HOLD
- **Wallet connect** (MetaMask / injected wallet)
- **Swap panel**: 0x quotes on Base/Ethereum, Jupiter link for Solana

## Deploy to Vercel

1. Push this repo to [github.com/ibrahim0-cursor/cursor-arc-circle](https://github.com/ibrahim0-cursor/cursor-arc-circle)
2. Go to [vercel.com/new](https://vercel.com/new) → Import GitHub repo
3. Add environment variables from `.env.example`
4. Deploy — root directory is `/`, framework Next.js auto-detected

Required env vars for full NEXUS: `OPENAI_API_KEY`, `BIRDEYE_API_KEY`, `NEWS_API_KEY`, `CIRCLE_API_KEY`, `ALCHEMY_API_KEY`, `NEXT_PUBLIC_ALCHEMY_BASE_RPC`

Optional: `ZEROX_API_KEY` for on-chain EVM swap execution

### Supabase setup (required for Vercel persistence)

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/pjtkiktpdvhghkqwqpok/sql)
2. Run the SQL in `supabase/schema.sql` (includes `demo_portfolios` for mobile demo trades)
3. In Vercel, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`
4. Verify: `npm run health` — `demoPortfolio.tableOk` should be `true`

### No OpenAI / Claude?

The app runs fully in **heuristic mode** using DexScreener, Birdeye, GDELT, and NewsAPI — no paid AI keys needed.

## Repository

[github.com/ibrahim0-cursor/cursor-arc-circle](https://github.com/ibrahim0-cursor/cursor-arc-circle)

## Submission checklist

- [ ] Public GitHub repo
- [ ] 3-minute Loom demo covering NEXUS + PRISM
- [ ] Live deployed URL
- [ ] Report traction in submission form

Built for Agora · Canteen × Circle · 2026 · **Arc Testnet v0.7.1**
