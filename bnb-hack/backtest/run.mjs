#!/usr/bin/env node
/**
 * NEXUS Gate backtest CLI — delegates to real historical runner.
 * Usage: node bnb-hack/backtest/run.mjs --symbol BNB --days 90 [--write-report]
 * Env: CMC_API_KEY or CMC_PRO_API_KEY
 * Without key: offline fixture for local smoke only (not used in /gate API).
 */

import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { runHistoricalBacktest } from "../live/run-backtest.mjs";
import { cmcKey } from "../live/cmc-fetch.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = { symbol: "BNB", days: 90, writeReport: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--symbol" && argv[i + 1]) out.symbol = argv[++i].toUpperCase();
    else if (argv[i] === "--days" && argv[i + 1]) out.days = parseInt(argv[++i], 10);
    else if (argv[i] === "--write-report") out.writeReport = true;
    else if (argv[i] === "--help") {
      console.log("Usage: node run.mjs [--symbol BNB] [--days 90] [--write-report]");
      process.exit(0);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!cmcKey()) {
    console.log("No CMC_API_KEY — offline fixture smoke only (not for judge submission)\n");
    const { fixtureSeries } = await import("./fixture-series.mjs");
    const { backtestSeries, evaluateNexusGate, toStructuredOutput } = await import(
      "../engine/nexus-gate.mjs"
    );
    const series = fixtureSeries;
    const last = series[series.length - 1];
    const evalNow = toStructuredOutput(last, evaluateNexusGate(last));
    const bt = backtestSeries(series);
    const out = {
      mode: "fixture-offline-only",
      warning: "NOT for submission — set CMC_API_KEY for live-historical backtest",
      symbol: "BNB",
      strategy: "nexus-momentum-gate/v1.1.0",
      evalNow,
      backtest: bt,
      generatedAt: new Date().toISOString(),
    };
    console.log(JSON.stringify(out, null, 2));
    if (args.writeReport) {
      writeFileSync(join(__dir, "sample-output.json"), JSON.stringify(out, null, 2));
    }
    return;
  }

  const result = await runHistoricalBacktest({
    symbol: args.symbol,
    days: args.days,
    includeCompare: true,
  });

  const out = result.ok
    ? {
        ok: true,
        mode: result.mode,
        symbol: result.symbol,
        strategy: result.strategy,
        bars: result.bars,
        evalNow: result.evalNow,
        backtest: result.backtest,
        compare: result.compare,
        methodology: result.methodology,
        generatedAt: result.generatedAt,
      }
    : result;

  console.log(JSON.stringify(out, null, 2));

  if (args.writeReport && result.ok) {
    writeFileSync(join(__dir, "sample-output.json"), JSON.stringify(out, null, 2));
  }

  if (!result.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
