/**
 * Sync Dune query IDs + dashboard URL to trader-arc on Vercel (REST upsert).
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const projectId = "prj_STdP5AoeDZC8uISeiqXg2cn6XJPr";
const teamId = "team_apDtKK364C3BW1LjG3M93rhI";

function getToken() {
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

async function upsertEnv(token, key, value, targets) {
  for (const target of targets) {
    const res = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}/env?upsert=true&teamId=${teamId}`,
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
      console.error(`FAIL ${key} (${target})`, res.status, JSON.stringify(body).slice(0, 200));
      process.exitCode = 1;
    } else {
      console.log(`OK ${key} (${target})`);
    }
  }
}

const genPath = join(root, "scripts", "dune-env.generated.json");
if (!existsSync(genPath)) {
  console.error("Run: node scripts/dune-create-queries.mjs");
  process.exit(1);
}

const config = JSON.parse(readFileSync(genPath, "utf8"));
const token = getToken();
const targets = ["production", "preview", "development"];
const keys = [
  "DUNE_BNB_STATS_QUERY_ID",
  "DUNE_BNB_TX_QUERY_ID",
  "DUNE_PRISM_QUERY_ID",
  "NEXT_PUBLIC_DUNE_DASHBOARD_URL",
  "DUNE_DASHBOARD_URL",
];

for (const key of keys) {
  if (config[key]) await upsertEnv(token, key, config[key], targets);
}

console.log("Done syncing Dune env to trader-arc.");
