/**
 * Sync CMC keys to Vercel via REST (avoids hung CLI pipes on Windows).
 * Uses project/team IDs from linked trader-arc project.
 * Auth: Vercel CLI session (run `npx vercel whoami` first) or VERCEL_TOKEN.
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const projectId = "prj_STdP5AoeDZC8uISeiqXg2cn6XJPr";
const teamId = "team_apDtKK364C3BW1LjG3M93rhI";

function loadEnvLocal() {
  const map = {};
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > 0) map[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return map;
}

function getToken() {
  if (process.env.VERCEL_TOKEN?.trim()) return process.env.VERCEL_TOKEN.trim();
  const paths = [
    join(process.env.APPDATA || "", "com.vercel.cli", "auth.json"),
    join(process.env.USERPROFILE || "", ".vercel", "auth.json"),
    join(process.env.HOME || "", ".vercel", "auth.json"),
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
          type: "encrypted",
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

const env = loadEnvLocal();
const cmc = env.CMC_API_KEY;
const mcp = env.CMC_MCP_API_KEY || cmc;
if (!cmc) {
  console.error("CMC_API_KEY missing in .env.local");
  process.exit(1);
}

let token;
try {
  token = getToken();
} catch {
  console.log("No token file — checking CLI auth via whoami...");
  execSync("npx vercel whoami", { stdio: "inherit", cwd: root });
  token = getToken();
}

const targets = ["production", "preview", "development"];
await upsertEnv(token, "CMC_API_KEY", cmc, targets);
await upsertEnv(token, "CMC_MCP_API_KEY", mcp, targets);
console.log("Done syncing CMC keys.");
