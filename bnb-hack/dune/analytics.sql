-- MERIDIAN BNB Hack — Dune queries for public analytics dashboard
-- Create at https://dune.com → New query → paste → Run → Save → Add to dashboard
-- Set query IDs on Vercel: DUNE_BNB_STATS_QUERY_ID, DUNE_BNB_TX_QUERY_ID

-- ═══════════════════════════════════════════════════════════════════
-- QUERY 1: Summary stats (single row — use as DUNE_BNB_STATS_QUERY_ID)
-- Replace vault address if NEXT_PUBLIC_AGENT_VAULT_ADDRESS differs
-- ═══════════════════════════════════════════════════════════════════

WITH vault AS (
  SELECT 0x11c1695A3AC5EF9d0B92572f0730F7AC3C87A715 AS addr
),
vault_txs AS (
  SELECT t.hash, t."from", t."to", t.block_time
  FROM bnb_testnet.transactions t
  CROSS JOIN vault v
  WHERE t."from" = v.addr OR t."to" = v.addr
),
router AS (
  SELECT 0xD99D1c33F9fC3444f8101754aBC46c52416550D1 AS addr -- PancakeSwap V2 Chapel
),
router_txs AS (
  SELECT t.hash, t."from", t.block_time
  FROM bnb_testnet.transactions t
  CROSS JOIN router r
  WHERE t."to" = r.addr OR t."from" = r.addr
)

SELECT
  (SELECT COUNT(*) FROM vault_txs) AS vault_tx_count,
  (SELECT COUNT(DISTINCT "from") FROM vault_txs) AS vault_unique_senders,
  (SELECT COUNT(*) FROM router_txs WHERE block_time > NOW() - INTERVAL '7' DAY) AS pancake_txs_7d,
  (SELECT COUNT(DISTINCT "from") FROM router_txs WHERE block_time > NOW() - INTERVAL '7' DAY) AS pancake_unique_wallets_7d,
  (SELECT MAX(block_time) FROM vault_txs) AS last_vault_activity,
  (SELECT MAX(block_time) FROM router_txs) AS last_pancake_activity;

-- ═══════════════════════════════════════════════════════════════════
-- QUERY 2: Recent vault + router txs (use as DUNE_BNB_TX_QUERY_ID)
-- ═══════════════════════════════════════════════════════════════════

SELECT
  block_time,
  hash,
  "from",
  "to",
  value / 1e18 AS value_bnb
FROM bnb_testnet.transactions
WHERE "from" = 0x11c1695A3AC5EF9d0B92572f0730F7AC3C87A715
   OR "to"   = 0x11c1695A3AC5EF9d0B92572f0730F7AC3C87A715
   OR "to"   = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1
ORDER BY block_time DESC
LIMIT 50;
