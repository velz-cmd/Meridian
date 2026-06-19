-- MERIDIAN BNB Hack — Dune queries (BSC mainnet — Dune has no bnb_testnet catalog)
-- Chapel demo executes on testnet; Dune tracks the same PancakeSwap venue on BNB mainnet.
-- Router: PancakeSwap V2 mainnet 0x10ED43C718714eb63d5aB0B6e856Ad65E60260417

-- QUERY 1: Summary stats → DUNE_BNB_STATS_QUERY_ID
-- Note: Dune indexes BSC mainnet (not Chapel testnet). Same CAKE/BNB venue as strategy desk.

SELECT
  COUNT(*) AS cake_bnb_dex_trades_30d,
  COUNT(DISTINCT tx_from) AS cake_dex_unique_traders_30d,
  SUM(amount_usd) AS cake_bnb_volume_usd_30d,
  MAX(block_time) AS last_cake_dex_trade
FROM dex.trades
WHERE blockchain = 'bnb'
  AND block_time > NOW() - INTERVAL '30' DAY
  AND (
    lower(token_bought_symbol) IN ('cake', 'wbnb', 'bnb')
    OR lower(token_sold_symbol) IN ('cake', 'wbnb', 'bnb')
  );

-- QUERY 2: Recent CAKE/BNB dex trades → DUNE_BNB_TX_QUERY_ID

SELECT
  block_time,
  tx_hash AS hash,
  tx_from AS "from",
  project,
  token_bought_symbol,
  token_sold_symbol,
  amount_usd
FROM dex.trades
WHERE blockchain = 'bnb'
  AND block_time > NOW() - INTERVAL '7' DAY
  AND (
    lower(token_bought_symbol) IN ('cake', 'wbnb', 'bnb')
    OR lower(token_sold_symbol) IN ('cake', 'wbnb', 'bnb')
  )
ORDER BY block_time DESC
LIMIT 50;
