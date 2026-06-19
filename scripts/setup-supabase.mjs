#!/usr/bin/env node
/**
 * Apply full Supabase schema (like Vercel deploy for the database).
 *
 * Requires ONE of these in .env.local:
 *   SUPABASE_ACCESS_TOKEN  — https://supabase.com/dashboard/account/tokens
 *   SUPABASE_DB_PASSWORD   — Project → Settings → Database → Database password
 *   SUPABASE_DB_URL        — Full postgres URI from dashboard
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const sql = readFileSync(join(root, "supabase", "schema.sql"), "utf8");
const projectRef =
  process.env.SUPABASE_PROJECT_REF ??
  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

function resolveDbUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password || !projectRef) return null;
  const host = process.env.SUPABASE_DB_HOST ?? "aws-0-us-east-1.pooler.supabase.com";
  return `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@${host}:6543/postgres`;
}

async function viaManagementApi() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token || !projectRef) return false;

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Management API ${res.status}: ${text.slice(0, 500)}`);
  return true;
}

async function viaPostgres() {
  const url = resolveDbUrl();
  if (!url) return false;
  const pg = await import("pg");
  const client = new pg.default.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
  return true;
}

async function verifyTables() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  const sb = createClient(url, key);
  const tables = [
    "demo_portfolios",
    "agent_vault_ledgers",
    "agent_vault_meta",
    "product_events",
    "connected_wallets",
  ];
  for (const table of tables) {
    const { error } = await sb.from(table).select("*").limit(1);
    if (error?.message?.includes("does not exist")) {
      console.log(`  ✗ ${table}`);
      return false;
    }
    console.log(`  ✓ ${table}`);
  }
  return true;
}

async function main() {
  console.log("Supabase setup — project:", projectRef ?? "(unknown)\n");

  if (await viaManagementApi()) {
    console.log("Schema applied via SUPABASE_ACCESS_TOKEN\n");
  } else if (await viaPostgres()) {
    console.log("Schema applied via database connection\n");
  } else {
    console.error(`Cannot run SQL automatically. Add to .env.local:

  SUPABASE_ACCESS_TOKEN=sbp_...   (recommended — Account → Access Tokens)
  # or
  SUPABASE_DB_PASSWORD=...        (Settings → Database)

Then run: npm run setup:supabase

Or paste supabase/schema.sql in:
https://supabase.com/dashboard/project/${projectRef ?? "pjtkiktpdvhghkqwqpok"}/sql/new
`);
    process.exit(1);
  }

  console.log("Verifying tables:");
  const ok = await verifyTables();
  if (!ok) {
    console.error("\nSome tables missing — wait a few seconds and run again.");
    process.exit(1);
  }
  console.log("\nSupabase ready. Run: npm run health");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
