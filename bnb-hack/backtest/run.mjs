#!/usr/bin/env node
/**
 * NEXUS Gate backtest — CMC historical quotes + synthetic TA proxy when TA API unavailable.
 * Usage: node bnb-hack/backtest/run.mjs --symbol BNB --days 90
 * Env: CMC_API_KEY or CMC_PRO_API_KEY
 */

import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { evaluateNexusGate, backtestSeries, toStructuredOutput } from "../engine/nexus-gate.mjs";
import {
  cmcKey,
  cmcFetch,
  fetchLiveSnapshot,
  fetchHistoricalDaily,
  rsiProxy,
  macdProxy,
  resolveSymbolId,
} from "../live/cmc-fetch.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = { symbol: "BNB", days: 90, feeBps: 10, slippageBps: 0, writeReport: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--symbol" && argv[i + 1]) out.symbol = argv[++i].toUpperCase();
    else if (argv[i] === "--days" && argv[i + 1]) out.days = parseInt(argv[++i], 10);
    else if (argv[i] === "--fee-bps" && argv[i + 1]) out.feeBps = parseInt(argv[++i], 10);
    else if (argv[i] === "--slippage-bps" && argv[i + 1]) out.slippageBps = parseInt(argv[++i], 10);
    else if (argv[i] === "--write-report") out.writeReport = true;
    else if (argv[i] === "--help") {
      console.log(
        "Usage: node run.mjs [--symbol BNB] [--days 90] [--fee-bps 10] [--slippage-bps 0] [--write-report]",
      );
      process.exit(0);
    }
  }
  return out;
}

async function fetchHistorical(id, days) {
  const data = await fetchHistoricalDaily(id, days);
  const quotes = data.data?.quotes ?? [];
  return quotes.map((q) => {
    const usd = q.quote?.USD ?? {};
    return {
      time: q.timestamp,
      price: usd.price ?? 0,
      volume24h: usd.volume_24h ?? 0,
      marketCap: usd.market_cap ?? 0,
      change24h: usd.percent_change_24h ?? 0,
      change7d: usd.percent_change_7d ?? 0,
      change1h: usd.percent_change_1h ?? 0,
    };
  });
}

async function fetchFearGreed() {
  try {
    const data = await cmcFetch("/v3/fear-and-greed/historical", { limit: "1" });
    return data.data?.[0]?.value ?? 50;
  } catch {
    try {
      const data = await cmcFetch("/v3/fear-and-greed/latest", {});
      return data.data?.value ?? 50;
    } catch {
      return 50;
    }
  }
}

function buildSeries(raw, symbol, fearGreed) {
  const closes = raw.map((r) => r.price);
  return raw.map((row, i) => {
    const slice = closes.slice(0, i + 1);
    const ch1 =
      i > 0 && raw[i - 1].price
        ? ((row.price - raw[i - 1].price) / raw[i - 1].price) * 100
        : row.change24h * 0.04;
    let rsi = 50;
    if (slice.length >= 15) {
      let gains = 0;
      let losses = 0;
      for (let j = slice.length - 14; j < slice.length; j++) {
        const d = slice[j] - slice[j - 1];
        if (d >= 0) gains += d;
        else losses -= d;
      }
      const rs = losses === 0 ? 100 : gains / losses;
      rsi = Math.round((100 - 100 / (1 + rs)) * 10) / 10;
    } else {
      rsi = rsiProxy(row.change24h, row.change7d);
    }
    return {
      symbol,
      price: row.price,
      marketCap: row.marketCap,
      volume24h: row.volume24h,
      change1h: Math.round(ch1 * 100) / 100,
      change24h: row.change24h,
      change7d: row.change7d,
      rsi,
      macdSignal: macdProxy(ch1, row.change24h),
      fearGreed,
    };
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const key = cmcKey();

  if (!key) {
    console.log("No CMC_API_KEY — running fixture backtest (BNB synthetic series)\n");
    const { fixtureSeries } = await import("./fixture-series.mjs");
    const series = fixtureSeries;
    const last = series[series.length - 1];
    const evalNow = toStructuredOutput(last, evaluateNexusGate(last));
    const bt = backtestSeries(series, { feeBps: args.feeBps, slippageBps: args.slippageBps });
    const out = {
      mode: "fixture",
      symbol: "BNB",
      strategy: "nexus-momentum-gate/v1",
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

  try {
    const id = await resolveSymbolId(args.symbol);
    const raw = await fetchHistorical(id, args.days);
    const fg = await fetchFearGreed();
    const series = buildSeries(raw, args.symbol, fg);
    const warmup = series.slice(14);
    const evalNow = toStructuredOutput(
      warmup[warmup.length - 1],
      evaluateNexusGate(warmup[warmup.length - 1]),
    );
    const bt = backtestSeries(warmup, { feeBps: args.feeBps, slippageBps: args.slippageBps });

    const out = {
      mode: "live-historical",
      symbol: args.symbol,
      strategy: "nexus-momentum-gate/v1",
      bars: series.length,
      evalNow,
      backtest: bt,
      generatedAt: new Date().toISOString(),
    };

    console.log(JSON.stringify(out, null, 2));
    if (args.writeReport) {
      writeFileSync(join(__dir, "sample-output.json"), JSON.stringify(out, null, 2));
    }
  } catch (e) {
    const msg = e.message || String(e);
    const planLimited = msg.includes("1006") || msg.includes("subscription plan");

    if (!planLimited) throw e;

    console.error(
      "CMC Basic plan: historical endpoint unavailable — using live snapshot + fixture backtest.\n",
    );

    const snap = await fetchLiveSnapshot(args.symbol);
    const evalNow = toStructuredOutput(snap, evaluateNexusGate(snap));
    const { fixtureSeries } = await import("./fixture-series.mjs");
    const bt = backtestSeries(fixtureSeries, { feeBps: args.feeBps, slippageBps: args.slippageBps });

    const out = {
      mode: "live-snapshot+fixture-backtest",
      symbol: args.symbol,
      strategy: "nexus-momentum-gate/v1",
      planNote:
        "CMC Basic API: quotes/latest + fear/greed live; historical backtest uses reproducible fixture until Standard plan.",
      evalNow,
      backtest: bt,
      generatedAt: new Date().toISOString(),
    };

    console.log(JSON.stringify(out, null, 2));
    if (args.writeReport) {
      writeFileSync(join(__dir, "sample-output.json"), JSON.stringify(out, null, 2));
    }
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
