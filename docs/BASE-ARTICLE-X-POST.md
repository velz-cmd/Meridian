# BASE IN JUNE 2026: THE COMPLETE PICTURE
### Everything that shipped after Azul — infrastructure, agents, builders, and what comes next

**@velz_noct · June 10, 2026**

---

Most of X is still asking *when Base token.*

Meanwhile Base rewrote its protocol, gave AI agents wallets, built an attribution economy, and became settlement rails for Mastercard and tokenized pesos — all in one quarter.

This is the **full up-to-date picture** as of June 10, 2026. Not a recap of old threads. A standalone reference from official Base sources.

---

## THE 60-SECOND THESIS

Base is no longer "Coinbase's fast L2."

It is five layers in production:

**Sovereign infrastructure** — Azul live. `base/base` v1.0.0 shipped June 3. Six hard forks per year.

**200ms performance** — Flashblocks preconfirmations on mainnet.

**Builder economy** — ERC-8021 Builder Codes. Free at base.dev.

**Identity** — Base Verify. One real account = one claim.

**Agents** — x402 at nine-figure scale. Base MCP in ChatGPT, Claude, Cursor.

Plus 110M Coinbase users as distribution.

---

## I. WHERE BASE STANDS TODAY

~$3.9B DeFi TVL. #1 Ethereum L2. 982 protocols. ~$1B+ daily DEX volume. ~409K active addresses/day.

$17T annual stablecoin transfer volume per Base Vision — payment infrastructure, not just DeFi.

1,000+ businesses on three tracks: Trading, Payments, Agents.

---

## II. AZUL AND THE UNIFIED STACK

**May 28, 2026** — Azul activated. Base's first fully independent upgrade.

**Multiproofs:** TEE (AWS Nitro) + ZK (Succinct SP1, $7.4B+ deposits). When both agree → ~1 day withdrawals. When they disagree → ZK overrides TEE. Soundness alerts auto-disable bad provers.

**Clients:** `base-reth-node` + `base-consensus` only. `op-node`/`op-geth` dead on canonical chain.

**June 3, 2026** — `base/base` **v1.0.0**: Reth v2.2.0, ERC-7562 tracing improvements.

**May 29–31 incident:** TEE enclave stalled L1 anchoring ~36 hours. L2 txs normal. No funds lost. First stress test of independent proving stack.

---

## III. FLASHBLOCKS AND THE JUNE FORK

2s → 200ms blocks via rollup-boost, op-rbuilder, node-reth.

Azul breaking change: Flashblocks WebSocket drops balances/receipts — room for Flashblock Access Lists.

**End of June fork:** enshrined token standard, Glamsterdam EIPs, single `base` binary, faster withdrawals.

**August:** native account abstraction at protocol level.

---

## IV. BUILDER ECONOMY — ERC-8021

Apps append data suffix to calldata. Contracts ignore it. Indexers credit you.

Builder Codes free at base.dev. Aerodrome, PancakeSwap, Privy, Turnkey, Virtuals, Moonwell + more committed.

Base allocates rewards on verifiable attribution — not opaque grants.

---

## V. BASE VERIFY

Deterministic token tied to X/Instagram/TikTok/Coinbase — not wallet. Trait proofs without data leakage. Live: Cody, Scratch, Bracket.

---

## VI. AGENTS — x402 AND BASE MCP

x402: HTTP 402 + USDC. 100M+ txs on Base. 480K+ agents.

**Base MCP** (May 26): `https://mcp.base.org`. OAuth 2.1. Stored Request Queue from Shopify Base Pay. Zero keys on server.

Morpho, Moonwell, Uniswap, Aerodrome, Avantis, Virtuals, Bankr plugins.

`npx skills add base/skills --skill base-mcp`

---

## VII. WALLETS — SUB ACCOUNTS

Session Keys failed audit. Sub Accounts shipped: hierarchical ownership, `wallet_addSubAccount`, Spend Permissions. Architecture behind MCP agents.

---

## VIII. PAYMENTS — MASTERCARD AND MXNB

Mastercard stablecoin settlement on Base. MXNB (tokenized peso) live on Aerodrome. $17T stablecoin volume thesis executing.

---

## IX. SECURITY AND ETHEREUM

Stage 1 live. Security Council 9/12 quorum. Base lobbied 6 Glamsterdam EIPs. Ships on Base before L1.

---

## CLOSE

CT asks when token.

Base already shipped: sovereign stack, multiproof security, attribution economy, agent wallets, institutional settlement.

**Are you building on today's Base — or 2024's?**

---

*Sources: base.org · blog.base.org · docs.base.org · Not financial advice.*
