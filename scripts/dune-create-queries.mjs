/**
 * Create/update MERIDIAN BNB Hack Dune queries, execute, sync env hints.
 * Usage: node scripts/dune-create-queries.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvLocal() {
  try {
    const raw = readFileSync(path.join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  } catch {
    /* no local env */
  }
}

loadEnvLocal();

const key = process.env.DUNE_API_KEY?.trim();
if (!key) {
  console.error("Set DUNE_API_KEY in .env.local");
  process.exit(1);
}

const headers = {
  "X-DUNE-API-KEY": key,
  "Content-Type": "application/json",
  Accept: "application/json",
};

async function dune(apiPath, opts = {}) {
  const res = await fetch(`https://api.dune.com/api/v1${apiPath}`, {
    ...opts,
    headers: { ...headers, ...opts.headers },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw new Error(`${opts.method ?? "GET"} ${apiPath} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

const STATS_SQL = `SELECT
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
  )`;

const TX_SQL = `SELECT
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
LIMIT 50`;

const STATS_NAME = "MERIDIAN BNB Hack — PancakeSwap BSC stats";
const TX_NAME = "MERIDIAN BNB Hack — recent CAKE/BNB dex trades";

async function createOrUpdateQuery(name, query_sql, existingId) {
  if (existingId) {
    await dune(`/query/${existingId}`, {
      method: "PATCH",
      body: JSON.stringify({ name, query_sql }),
    });
    try {
      await dune(`/query/${existingId}/unprivate`, { method: "PATCH", body: "{}" });
    } catch {
      /* already public */
    }
    return existingId;
  }
  const out = await dune("/query", {
    method: "POST",
    body: JSON.stringify({ name, query_sql, is_private: false }),
  });
  const id = out.query_id ?? out.id;
  if (!id) throw new Error(`No query_id: ${JSON.stringify(out)}`);
  return id;
}

async function executeAndWait(queryId) {
  const exec = await dune(`/query/${queryId}/execute`, { method: "POST", body: "{}" });
  const executionId = exec.execution_id;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const status = await dune(`/execution/${executionId}/status`);
    const state = status.state ?? status.execution_state;
    if (state === "QUERY_STATE_COMPLETED") return status;
    if (state === "QUERY_STATE_FAILED") throw new Error(`Query ${queryId} failed: ${JSON.stringify(status)}`);
  }
  throw new Error(`Query ${queryId} timed out`);
}

function patchEnvLocal(vars) {
  const envPath = path.join(root, ".env.local");
  let raw = readFileSync(envPath, "utf8");
  for (const [k, v] of Object.entries(vars)) {
    const re = new RegExp(`^${k}=.*$`, "m");
    if (re.test(raw)) raw = raw.replace(re, `${k}=${v}`);
    else raw += `\n${k}=${v}`;
  }
  writeFileSync(envPath, raw);
}

async function main() {
  const list = await dune("/queries?limit=50");
  const existing = list.queries ?? [];
  const findByName = (n) => existing.find((q) => q.name === n);
  const legacyStats = existing.find((q) => q.name?.includes("vault + Pancake stats"));
  const legacyTx = existing.find((q) => q.name?.includes("recent Chapel txs"));

  let statsId = findByName(STATS_NAME)?.query_id ?? legacyStats?.query_id ?? process.env.DUNE_BNB_STATS_QUERY_ID;
  let txId = findByName(TX_NAME)?.query_id ?? legacyTx?.query_id ?? process.env.DUNE_BNB_TX_QUERY_ID;

  console.log("Updating stats query…");
  statsId = await createOrUpdateQuery(STATS_NAME, STATS_SQL, statsId ? Number(statsId) : null);
  console.log("Stats query id:", statsId);

  console.log("Updating tx query…");
  txId = await createOrUpdateQuery(TX_NAME, TX_SQL, txId ? Number(txId) : null);
  console.log("Tx query id:", txId);

  console.log("Executing stats query (may take ~30s)…");
  await executeAndWait(statsId);
  console.log("Executing tx query…");
  await executeAndWait(txId);

  const statsResults = await dune(`/query/${statsId}/results?limit=5`);
  console.log("Stats sample:", JSON.stringify(statsResults.result?.rows?.[0] ?? {}, null, 2));

  const dashboardSlug = "meridian-bnb-hack";
  const config = {
    DUNE_BNB_STATS_QUERY_ID: String(statsId),
    DUNE_BNB_TX_QUERY_ID: String(txId),
    DUNE_PRISM_QUERY_ID: String(statsId),
    NEXT_PUBLIC_DUNE_DASHBOARD_URL: `https://dune.com/queries/${statsId}/`,
    DUNE_DASHBOARD_URL: `https://dune.com/queries/${statsId}/`,
  };

  writeFileSync(path.join(root, "scripts", "dune-env.generated.json"), JSON.stringify(config, null, 2));
  patchEnvLocal(config);

  console.log("\n=== Vercel env (run scripts/sync-dune-vercel.ps1) ===");
  console.log(JSON.stringify(config, null, 2));
  console.log(`\nPublic links:\n  Stats: https://dune.com/queries/${statsId}\n  Txs:   https://dune.com/queries/${txId}`);
  console.log(`\nNote: Dune has BSC mainnet only (no Chapel testnet). Stats track PancakeSwap V2 + CAKE/BNB dex.trades.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
