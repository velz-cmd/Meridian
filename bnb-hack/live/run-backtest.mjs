/**
 * Real CMC historical backtest only — no fixtures for public/judge paths.
 * @see bnb-hack/backtest/run.mjs CLI wrapper
 */

import {
  evaluateNexusGate,
  backtestSeries,
  backtestCompare,
  backtestEquityCurves,
  toStructuredOutput,
} from "../engine/nexus-gate.mjs";
import {
  cmcKey,
  cmcFetch,
  fetchLiveSnapshot,
  fetchHistoricalDaily,
  macdProxy,
  rsiProxy,
  resolveSymbolId,
} from "./cmc-fetch.mjs";
import { fetchBinanceDailySeries } from "./binance-klines.mjs";

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

/** Scale venue bars with live CMC market cap so turnover checks work (no fake mc=0). */
async function hydrateBarsWithCmcFundamentals(symbol, bars) {
  const live = await fetchLiveSnapshot(symbol);
  const cmcPrice = live.price ?? 0;
  const cmcMc = live.marketCap ?? 0;
  if (cmcPrice <= 0 || cmcMc <= 0) return bars;

  return bars.map((b, i, arr) => {
    const p7 = i >= 7 ? arr[i - 7].price : null;
    const change7d =
      p7 && p7 > 0 ? Math.round(((b.price - p7) / p7) * 1000) / 10 : (b.change7d ?? 0);
    return {
      ...b,
      marketCap: cmcMc * (b.price / cmcPrice),
      change7d,
    };
  });
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
      time: row.time ?? i,
    };
  });
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
    };
  });
}

/**
 * @param {ReturnType<typeof buildSeries>} series
 * @param {object} meta
 */
function packBacktestResult(series, meta) {
  const warmup = series.slice(14);
  const feeBps = meta.feeBps ?? 10;
  const slippageBps = meta.slippageBps ?? 0;
  const includeCompare = meta.includeCompare !== false;
  const evalNow = toStructuredOutput(
    warmup[warmup.length - 1],
    evaluateNexusGate(warmup[warmup.length - 1]),
  );
  const constitution = backtestSeries(warmup, { feeBps, slippageBps });
  const compare = includeCompare ? backtestCompare(warmup, { feeBps, slippageBps }) : null;
  const equityCurves = backtestEquityCurves(warmup, { feeBps, slippageBps });

  return {
    ok: true,
    mode: meta.mode,
    dataSource: meta.dataSource,
    liveGateDataSource: "coinmarketcap/quotes/latest",
    symbol: meta.symbol,
    strategy: "nexus-momentum-gate/v1.1.0",
    days: meta.days,
    bars: series.length,
    warmupBars: warmup.length,
    evalNow,
    backtest: constitution,
    compare,
    equityCurves,
    methodology: meta.methodology,
    note: meta.note,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @param {{ symbol?: string; days?: number; feeBps?: number; slippageBps?: number; includeCompare?: boolean }} opts
 */
export async function runHistoricalBacktest(opts = {}) {
  const symbol = (opts.symbol ?? "BNB").toUpperCase();
  const days = opts.days ?? 90;
  const feeBps = opts.feeBps ?? 10;
  const slippageBps = opts.slippageBps ?? 0;
  const includeCompare = opts.includeCompare !== false;
  const key = cmcKey();

  if (!key) {
    return {
      ok: false,
      mode: "unavailable",
      error: "CMC_API_KEY not configured on server",
      hint: "Set CMC_API_KEY for live gate + fear/greed macro in backtest",
    };
  }

  let fg = 50;
  try {
    fg = await fetchFearGreed();
  } catch {
    /* macro fallback */
  }

  try {
    const id = await resolveSymbolId(symbol);
    const raw = await fetchHistorical(id, days);
    if (raw.length < 15) {
      return {
        ok: false,
        mode: "insufficient-data",
        error: `Only ${raw.length} historical bars returned for ${symbol}`,
        hint: "Increase CMC plan tier or reduce --days",
      };
    }

    const series = buildSeries(raw, symbol, fg);
    return packBacktestResult(series, {
      symbol,
      days,
      feeBps,
      slippageBps,
      includeCompare,
      mode: "cmc-historical",
      dataSource: "coinmarketcap/quotes/historical-daily",
      methodology: {
        rsi: "14-period from CMC daily close prices",
        macd: "derived from CMC daily change",
        fearGreed: "coinmarketcap/fear-and-greed/latest",
        feesBps: feeBps,
        slippageBps,
      },
    });
  } catch (e) {
    const msg = e.message || String(e);
    const planLimited =
      msg.includes("1006") ||
      msg.includes("subscription plan") ||
      msg.includes("doesn't support this endpoint");

    if (!planLimited) {
      return { ok: false, mode: "error", error: msg };
    }

    try {
      const raw = await fetchBinanceDailySeries(symbol, days);
      const tail = raw.slice(-days);
      const hydrated = await hydrateBarsWithCmcFundamentals(symbol, tail);
      const series = buildSeries(hydrated, symbol, fg);
      return packBacktestResult(series, {
        symbol,
        days,
        feeBps,
        slippageBps,
        includeCompare,
        mode: "binance-venue-replay",
        dataSource: "binance-spot-daily-klines+cmc-market-cap-scaled",
        note:
          "CMC historical unavailable on this API tier. Prices from Binance spot daily closes; market cap scaled from live CMC quote; Fear & Greed from CoinMarketCap.",
        methodology: {
          rsi: "14-period from Binance daily close",
          macd: "derived from daily change",
          marketCap: "live CMC market_cap scaled by price ratio per bar",
          fearGreed: "coinmarketcap/fear-and-greed/latest (macro overlay)",
          feesBps: feeBps,
          slippageBps,
        },
      });
    } catch (binanceErr) {
      return {
        ok: false,
        mode: "plan-limited",
        error: "CMC historical requires Standard plan; Binance venue replay also failed",
        hint: "Upgrade CMC plan or check Binance API availability",
        detail: binanceErr.message || String(binanceErr),
      };
    }
  }
}

/** Live gate snapshot probe — quotes only, no synthetic backtest. */
export async function probeGateLive(symbol) {
  const sym = symbol.toUpperCase();
  if (!cmcKey()) {
    return { ok: false, error: "CMC_API_KEY not configured" };
  }
  try {
    const snap = await fetchLiveSnapshot(sym);
    return { ok: true, symbol: sym, snapshot: snap, dataSource: "coinmarketcap/quotes/latest" };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}
