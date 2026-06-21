#!/usr/bin/env node
/**
 * Quick production / local health check.
 * Usage: node scripts/health-check.mjs [baseUrl]
 * Default baseUrl: https://trader-arc.vercel.app
 */

const base = (process.argv[2] ?? "https://trader-arc.vercel.app").replace(/\/$/, "");

async function main() {
  const url = `${base}/api/status`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();

  console.log(`\nMERIDIAN health — ${base}\n`);
  console.log(`HTTP ${res.status}`);
  console.log(`Arc:        ${data.arc?.connected ? "ok" : "fail"} (${data.arc?.network})`);
  console.log(`Supabase:   ${data.supabase ? "configured" : "missing"}`);
  console.log(
    `Portfolio:  ${
      data.demoPortfolio?.tableOk
        ? "demo_portfolios ok"
        : data.demoPortfolio?.error ?? "not verified"
    }`,
  );
  if (data.supabaseTables?.length) {
    const missing = data.supabaseTables.filter((t) => !t.ok).map((t) => t.table);
    console.log(
      `Tables:     ${
        data.supabaseAllTablesOk ? "all ok" : `missing: ${missing.join(", ")}`
      }`,
    );
  }
  console.log(`Birdeye:    ${data.birdeyeProbe?.ok ? "ok" : data.birdeyeProbe?.error ?? "n/a"}`);
  console.log(`AI mode:    ${data.mode} (${data.aiProvider})`);

  if ((!data.demoPortfolio?.tableOk || data.supabaseAllTablesOk === false) && data.supabase) {
    console.log("\n→ Run supabase/schema.sql in your Supabase SQL Editor, then redeploy.\n");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
