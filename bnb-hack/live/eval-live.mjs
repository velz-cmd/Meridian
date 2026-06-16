#!/usr/bin/env node
/**
 * Live NEXUS gate evaluation from CMC quotes + Fear & Greed (Basic plan OK).
 * Usage: node bnb-hack/live/eval-live.mjs [--symbol BNB] [--symbol CAKE]
 */
import { fetchLiveSnapshot, cmcKey } from "./cmc-fetch.mjs";
import { evaluateNexusGate, toStructuredOutput } from "../engine/nexus-gate.mjs";

function parseArgs(argv) {
  const symbols = [];
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--symbol" && argv[i + 1]) symbols.push(argv[++i].toUpperCase());
    else if (argv[i] === "--help") {
      console.log("Usage: node eval-live.mjs [--symbol BNB] [--symbol CAKE]");
      process.exit(0);
    }
  }
  return symbols.length ? symbols : ["BNB", "CAKE"];
}

async function main() {
  if (!cmcKey()) {
    console.error("Set CMC_API_KEY in .env.local or environment");
    process.exit(1);
  }

  const symbols = parseArgs(process.argv);
  const results = [];

  for (const symbol of symbols) {
    const snap = await fetchLiveSnapshot(symbol);
    const gate = evaluateNexusGate(snap);
    results.push({
      mode: "live",
      dataSource: "cmc-pro-quotes-latest",
      ...toStructuredOutput(snap, gate),
    });
  }

  console.log(JSON.stringify(symbols.length === 1 ? results[0] : { mode: "live", results }, null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
