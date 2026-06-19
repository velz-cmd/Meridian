#!/usr/bin/env node
/** Backfill connected_wallets from demo_portfolios (historical traders). */
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase keys missing");

  const sb = createClient(url, key);
  const { data, error } = await sb.from("demo_portfolios").select("wallet, updated_at, trades");
  if (error) throw error;

  let upserted = 0;
  for (const row of data ?? []) {
    const wallet = String(row.wallet).toLowerCase();
    const trades = row.trades ?? [];
    const firstTrade = trades.map((t) => t.timestamp).filter(Boolean).sort()[0];
    const firstSeen = firstTrade ?? row.updated_at;
    const { error: upErr } = await sb.from("connected_wallets").upsert(
      {
        wallet,
        first_seen: firstSeen,
        last_seen: row.updated_at,
        connect_count: 1,
        last_path: "/nexus",
      },
      { onConflict: "wallet", ignoreDuplicates: false },
    );
    if (!upErr) upserted += 1;
    else console.warn(wallet, upErr.message);
  }
  console.log(`Backfilled ${upserted} wallets from demo_portfolios`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
