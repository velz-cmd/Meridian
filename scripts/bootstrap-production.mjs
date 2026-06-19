#!/usr/bin/env node
/**
 * One-shot production bootstrap: Supabase schema + keys → Vercel env → Dune → redeploy.
 * Usage: node scripts/bootstrap-production.mjs
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const VERCEL_PROJECT_ID = "prj_STdP5AoeDZC8uISeiqXg2cn6XJPr";
const VERCEL_TEAM_ID = "team_apDtKK364C3BW1LjG3M93rhI";

function log(msg) {
  console.log(msg);
}

function getVercelToken() {
  if (process.env.VERCEL_TOKEN?.trim()) return process.env.VERCEL_TOKEN.trim();
  const paths = [
    join(process.env.APPDATA || "", "com.vercel.cli", "Data", "auth.json"),
    join(process.env.APPDATA || "", "com.vercel.cli", "auth.json"),
    join(process.env.USERPROFILE || "", ".vercel", "auth.json"),
    join(process.env.APPDATA || "", "xdg.data", "com.vercel.cli", "auth.json"),
  ];
  for (const p of paths) {
    if (!existsSync(p)) continue;
    try {
      const j = JSON.parse(readFileSync(p, "utf8"));
      if (j.token) return j.token;
    } catch {
      /* next */
    }
  }
  throw new Error("No VERCEL_TOKEN — run: npx vercel login");
}

async function fetchSupabaseKeys() {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const ref =
    process.env.SUPABASE_PROJECT_REF ??
    process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!token || !ref) throw new Error("SUPABASE_ACCESS_TOKEN and project ref required in .env.local");

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Supabase api-keys ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const keys = await res.json();
  const out = {};
  for (const row of keys) {
    if (row.name === "anon") {
      out.NEXT_PUBLIC_SUPABASE_ANON_KEY = row.api_key;
      out.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = row.api_key;
    }
    if (row.name === "service_role") {
      out.SUPABASE_SERVICE_ROLE_KEY = row.api_key;
      out.SUPABASE_SECRET_KEY = row.api_key;
    }
  }
  if (!out.SUPABASE_SECRET_KEY) throw new Error("Could not fetch service_role key");
  return out;
}

function patchEnvLocal(pairs) {
  const path = join(root, ".env.local");
  let lines = existsSync(path) ? readFileSync(path, "utf8").split(/\r?\n/) : [];
  for (const [key, value] of Object.entries(pairs)) {
    if (!value) continue;
    const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
    const row = `${key}=${value}`;
    if (idx >= 0) lines[idx] = row;
    else lines.push(row);
  }
  writeFileSync(path, lines.filter(Boolean).join("\n") + "\n", "utf8");
  log(`Updated .env.local: ${Object.keys(pairs).join(", ")}`);
}

async function upsertVercelEnv(token, key, value, targets) {
  for (const target of targets) {
    const res = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env?upsert=true&teamId=${VERCEL_TEAM_ID}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key,
          value,
          type: key.startsWith("NEXT_PUBLIC_") ? "plain" : "encrypted",
          target: [target],
        }),
      },
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      log(`FAIL ${key} (${target}) ${res.status} ${JSON.stringify(body).slice(0, 120)}`);
      return false;
    }
    log(`OK ${key} → ${target}`);
    return true;
  }
  return true;
}

async function syncEnvToVercel(pairs) {
  const token = getVercelToken();
  const targets = ["production", "preview", "development"];
  for (const [key, value] of Object.entries(pairs)) {
    if (!value) continue;
    for (const target of targets) {
      await upsertVercelEnv(token, key, value, [target]);
    }
  }
}

async function applySchema() {
  log("\n── Supabase schema ──");
  execSync("node scripts/setup-supabase.mjs", { cwd: root, stdio: "inherit" });
}

async function loadDuneConfig() {
  const genPath = join(root, "scripts", "dune-env.generated.json");
  if (!existsSync(genPath)) return {};
  return JSON.parse(readFileSync(genPath, "utf8"));
}

async function probeTables() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const sb = createClient(url, key);
  for (const table of ["demo_portfolios", "product_events", "connected_wallets"]) {
    const { error } = await sb.from(table).select("*").limit(1);
    log(`  ${table}: ${error ? error.message : "ok"}`);
  }
}

async function main() {
  log("MERIDIAN production bootstrap\n");

  log("── Fetch Supabase API keys ──");
  const sbKeys = await fetchSupabaseKeys();
  patchEnvLocal(sbKeys);
  dotenv.config({ path: join(root, ".env.local"), override: true });

  await applySchema();
  await probeTables();

  const dune = await loadDuneConfig();
  const envBatch = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    ...sbKeys,
    SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
    SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF,
    DUNE_API_KEY: process.env.DUNE_API_KEY,
    ...dune,
    NEXT_PUBLIC_SITE_LAUNCH_DATE:
      process.env.NEXT_PUBLIC_SITE_LAUNCH_DATE || "2025-03-01",
  };

  log("\n── Link Vercel project (trader-arc) ──");
  execSync("npx vercel link --project trader-arc --yes", { cwd: root, stdio: "inherit" });

  log("\n── Sync env → Vercel (trader-arc) ──");
  await syncEnvToVercel(envBatch);

  log("\n── Production deploy ──");
  execSync("npx vercel deploy --prod --yes", { cwd: root, stdio: "inherit" });

  log("\n── Health check ──");
  execSync("node scripts/health-check.mjs https://trader-arc.vercel.app", {
    cwd: root,
    stdio: "inherit",
  });

  log("\nBootstrap complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
