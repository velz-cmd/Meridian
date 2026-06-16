/**
 * Shared demo runner for CLI and /api/bnb/demo (Vercel-safe import).
 */
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
import { fixtureSeries } from "./fixture-series.mjs";

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

/**
 * @param {{ live?: boolean; symbol?: string; days?: number; feeBps?: number; slippageBps?: number }} opts
 */
export async function runBnbDemo(opts = {}) {
  const symbol = (opts.symbol ?? "BNB").toUpperCase();
  const days = opts.days ?? 90;
  const feeBps = opts.feeBps ?? 10;
  const slippageBps = opts.slippageBps ?? 0;
  const live = opts.live ?? false;
  const key = live ? cmcKey() : "";

  if (!key) {
    const last = fixtureSeries[fixtureSeries.length - 1];
    return {
      mode: "fixture",
      symbol: "BNB",
      strategy: "nexus-momentum-gate/v1",
      evalNow: toStructuredOutput(last, evaluateNexusGate(last)),
      backtest: backtestSeries(fixtureSeries, { feeBps, slippageBps }),
      generatedAt: new Date().toISOString(),
    };
  }

  try {
    const id = await resolveSymbolId(symbol);
    const raw = await fetchHistorical(id, days);
    const fg = await fetchFearGreed();
    const series = buildSeries(raw, symbol, fg);
    const warmup = series.slice(14);
    return {
      mode: "live-historical",
      symbol,
      strategy: "nexus-momentum-gate/v1",
      bars: series.length,
      evalNow: toStructuredOutput(warmup[warmup.length - 1], evaluateNexusGate(warmup[warmup.length - 1])),
      backtest: backtestSeries(warmup, { feeBps, slippageBps }),
      generatedAt: new Date().toISOString(),
    };
  } catch (e) {
    const msg = e?.message || String(e);
    const planLimited = msg.includes("1006") || msg.includes("subscription plan");
    if (!planLimited) throw e;

    const snap = await fetchLiveSnapshot(symbol);
    return {
      mode: "live-snapshot+fixture-backtest",
      symbol,
      strategy: "nexus-momentum-gate/v1",
      planNote:
        "CMC Basic API: quotes/latest + fear/greed live; historical backtest uses reproducible fixture until Standard plan.",
      evalNow: toStructuredOutput(snap, evaluateNexusGate(snap)),
      backtest: backtestSeries(fixtureSeries, { feeBps, slippageBps }),
      generatedAt: new Date().toISOString(),
    };
  }
}
