# MERIDIAN Roadmap 2026 — post Track 2 submission

This document captures planned work **after** BNB Hack Track 2 submission. It does not block the scored deliverable (CMC Skill + STRATEGY_SPEC + engine + backtest).

## Multi-timeframe verdicts (Phase 3)

### Data layer

| Timeframe | Near-term source | Label |
|-----------|------------------|-------|
| 1h, 1d | CMC quotes + historical daily | Live CMC |
| 3d, 1w | CMC change7d/30d proxies | Proxy · not bar |
| 15m, 4h, 12h | Binance klines (`bnb-hack/live/binance-klines.mjs`) | Live venue |
| 3m, 5m, 30m | Binance or Birdeye | Gate symbols first |

### Engine

- Extend `buildMeridianDirectionEvidence` → `perTimeframeVerdicts[]` with long/short/hold/conflict/dataQuality per TF.
- Hierarchy rule: higher bucket anchors; lower cannot override swing without consensus (extend `timeHorizonBucket === "mixed"` veto).
- Horizon-selected router: user picks Scalp / Intraday / Swing / Position on Overview; `resolvePositionDirection` accepts `horizonBucket`.

### Product

- `GateTimeframeDesk` ships first with honest **live-cmc / planned / DATA UNAVAILABLE** badges (already on Technical tab).
- Full OHLCV per TF rolls out incrementally — never fake per-TF LONG/SHORT until bars exist.

## Memory Ledger + signed artifacts (Phase 4)

Wallet-neutral proof layer — Trust Wallet is a mobile path, not a privilege.

- **Memory Ledger:** append-only daily rows (regime, desk, court, permit, twin) in Supabase or local export.
- **Time Capsule:** freeze intelligence snapshot hash from `/api/meridian/intelligence` + `/api/gate/evaluate`.
- **Optional sign:** `signMessage` with `{ permitId, snapshotHash, symbol, expires }` — any wallet.
- **Decision Passport:** aggregate view over ledger only when N ≥ threshold; else “Insufficient history”.

## Principles

```
TRACK2_PRIORITY: Gate = CMC Strategy Skill product surface.
Execution is secondary. Strategy intelligence is primary.
Overview = router ONE TRUTH. Sub-tabs explain. Never compete.
Multi-TF: different horizons, different truths — honest sources only.
Wallets carry intelligence; they never own it.
```
