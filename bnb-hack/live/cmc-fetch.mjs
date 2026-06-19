/**
 * CoinMarketCap Pro REST helpers (Basic plan: quotes + fear/greed).
 * Server-side TTL cache saves credits and improves permit latency.
 */

import { fetchBinanceDailySeries } from "./binance-klines.mjs";
import {
  computeVolatilityFromCloses,
  computeVolatilityFromOhlcBars,
} from "../engine/volatility-metrics.mjs";

/** Live RSI/MACD + volatility compression from Binance daily when CMC historical tier blocks. */
async function hydrateTechnicalsFromBinance(symbol, quotes) {
  try {
    const bars = await fetchBinanceDailySeries(symbol, 30);
    if (bars.length < 15) return null;
    const closes = bars.map((b) => b.price);
    const rsi = computeRsi14(closes);
    const last = bars[bars.length - 1];
    const prev = bars[bars.length - 2];
    const ch1 =
      prev?.price && last?.price ? ((last.price - prev.price) / prev.price) * 100 : quotes.change1h;
    const volatility = computeVolatilityFromOhlcBars(bars);
    return {
      rsi: rsi ?? quotes.rsi,
      macdSignal: macdProxy(ch1, quotes.change24h),
      sourceRsi: "binance-spot-daily-14rsi",
      sourceMacd: "binance-spot-daily-derived",
      sourceVolatility: volatility?.source ?? "binance-spot-daily-ohlc",
      bars: bars.length,
      volatility,
    };
  } catch {
    return null;
  }
}

const API = "https://pro-api.coinmarketcap.com";

const TTL_MS = { fearGreed: 120_000, quotes: 90_000, map: 600_000, batch: 90_000 };
/** @type {Map<string, { at: number; data: unknown }>} */
const cache = new Map();

function cacheGet(key, allowStale = false) {
  const row = cache.get(key);
  if (!row) return null;
  const ttl = key.startsWith("fg:")
    ? TTL_MS.fearGreed
    : key.startsWith("map:")
      ? TTL_MS.map
      : key.startsWith("quotes:batch:")
        ? TTL_MS.batch
        : TTL_MS.quotes;
  if (Date.now() - row.at > ttl) {
    if (allowStale) return row.data;
    cache.delete(key);
    return null;
  }
  return row.data;
}

function cacheSet(key, data) {
  cache.set(key, { at: Date.now(), data });
}

/** @returns {{ entries: number; keys: string[] }} */
export function cmcCacheStats() {
  return { entries: cache.size, keys: [...cache.keys()] };
}

export function cmcKey() {
  return process.env.CMC_API_KEY || process.env.CMC_PRO_API_KEY || "";
}

export async function cmcFetch(path, params = {}, opts = {}) {
  const key = cmcKey();
  if (!key) throw new Error("Set CMC_API_KEY or CMC_PRO_API_KEY");
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  ).toString();
  const cacheKey = opts.cacheKey ?? null;
  if (cacheKey) {
    const hit = cacheGet(cacheKey);
    if (hit) return hit;
  }
  const res = await fetch(`${API}${path}?${qs}`, {
    headers: { "X-CMC_PRO_API_KEY": key, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j.status?.error_message || text;
    } catch {
      /* keep raw */
    }
    if (res.status === 429 && cacheKey) {
      const stale = cache.get(cacheKey);
      if (stale) return stale.data;
    }
    const err = /** @type {Error & { status?: number; code?: string }} */ (new Error(`CMC ${res.status}: ${msg}`));
    err.status = res.status;
    throw err;
  }
  const parsed = JSON.parse(text);
  if (cacheKey) cacheSet(cacheKey, parsed);
  return parsed;
}

export async function resolveSymbolId(symbol) {
  const data = await cmcFetch(
    "/v1/cryptocurrency/map",
    { symbol, limit: "10" },
    { cacheKey: `map:${symbol.toUpperCase()}` },
  );
  const row = data.data?.find((r) => r.symbol === symbol && r.rank < 9000) ?? data.data?.[0];
  if (!row) throw new Error(`Symbol not found: ${symbol}`);
  return row.id;
}

/** RSI proxy when historical bars unavailable — labeled honestly in gate API. */
export function rsiProxy(change24h, change7d) {
  const momentum = change24h * 0.6 + (change7d ?? 0) * 0.4;
  return Math.round(Math.min(78, Math.max(22, 50 + momentum * 0.85)) * 10) / 10;
}

export function macdProxy(change1h, change24h) {
  if (change1h > 1.5 && change24h > 0) return "bullish";
  if (change1h < -1.5 && change24h < 0) return "bearish";
  return "neutral";
}

/** Standard 14-period RSI from daily close prices (CMC historical). */
export function computeRsi14(closes) {
  if (closes.length < 15) return null;
  let gains = 0;
  let losses = 0;
  for (let j = closes.length - 14; j < closes.length; j++) {
    const d = closes[j] - closes[j - 1];
    if (d >= 0) gains += d;
    else losses -= d;
  }
  const rs = losses === 0 ? 100 : gains / losses;
  return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
}

/**
 * Gate-grade snapshot — CoinMarketCap only, with honest field provenance.
 * @param {string} symbol
 */
export async function fetchGateSnapshot(symbol) {
  const sym = symbol.toUpperCase();
  const quotes = await fetchLiveSnapshot(sym);
  /** @type {Record<string, string | number | null>} */
  const sources = {
    price: "coinmarketcap/quotes/latest",
    marketCap: "coinmarketcap/quotes/latest",
    volume24h: "coinmarketcap/quotes/latest",
    change1h: "coinmarketcap/quotes/latest",
    change24h: "coinmarketcap/quotes/latest",
    change7d: "coinmarketcap/quotes/latest",
    change30d: "coinmarketcap/quotes/latest",
    volumeChange24h: "coinmarketcap/quotes/latest",
    cmcRank: "coinmarketcap/quotes/latest",
    fdv: "coinmarketcap/quotes/latest",
    fearGreed: "coinmarketcap/fear-and-greed/latest",
    rsi: "coinmarketcap/quotes-momentum-proxy",
    macd: "coinmarketcap/quotes-momentum-proxy",
    historicalBars: null,
  };

  try {
    const id = await resolveSymbolId(sym);
    const data = await fetchHistoricalDaily(id, 30);
    const bars = data.data?.quotes ?? [];
    if (bars.length >= 15) {
      const closes = bars.map((q) => q.quote?.USD?.price ?? 0);
      const rsi = computeRsi14(closes);
      const last = bars[bars.length - 1];
      const prev = bars[bars.length - 2];
      const ch1 =
        prev?.quote?.USD?.price && last?.quote?.USD?.price
          ? ((last.quote.USD.price - prev.quote.USD.price) / prev.quote.USD.price) * 100
          : quotes.change1h;

      sources.rsi = "computed-14d-from-cmc-historical-daily";
      sources.macd = "derived-from-cmc-historical-daily";
      sources.historicalBars = bars.length;
      const volatility = computeVolatilityFromCloses(closes);
      if (volatility) sources.volatility = volatility.source;

      return {
        snapshot: {
          ...quotes,
          rsi: rsi ?? quotes.rsi,
          macdSignal: macdProxy(ch1, quotes.change24h),
        },
        sources,
        cmcLive: true,
        volatility,
      };
    }
  } catch {
    /* fall through to Binance venue technicals */
  }

  try {
    const venue = await hydrateTechnicalsFromBinance(sym, quotes);
    if (venue) {
      sources.rsi = venue.sourceRsi;
      sources.macd = venue.sourceMacd;
      sources.historicalBars = venue.bars;
      if (venue.sourceVolatility) sources.volatility = venue.sourceVolatility;
      return {
        snapshot: {
          ...quotes,
          rsi: venue.rsi,
          macdSignal: venue.macdSignal,
        },
        sources,
        cmcLive: true,
        volatility: venue.volatility ?? null,
      };
    }
  } catch {
    /* quotes-only proxy — last resort */
  }

  return { snapshot: quotes, sources, cmcLive: true };
}

function quoteRowToSnapshot(sym, row, fearGreed) {
  const usd = row.quote?.USD ?? {};
  const ch1 = usd.percent_change_1h ?? 0;
  const ch24 = usd.percent_change_24h ?? 0;
  const ch7 = usd.percent_change_7d ?? 0;
  const ch30 = usd.percent_change_30d ?? null;
  return {
    symbol: sym,
    price: usd.price ?? 0,
    marketCap: usd.market_cap ?? 0,
    volume24h: usd.volume_24h ?? 0,
    change1h: ch1,
    change24h: ch24,
    change7d: ch7,
    change30d: ch30 != null ? Number(ch30) : null,
    volumeChange24h: usd.volume_change_24h != null ? Number(usd.volume_change_24h) : null,
    cmcRank: row.cmc_rank ?? null,
    fdv: usd.fully_diluted_market_cap ?? null,
    rsi: rsiProxy(ch24, ch7),
    macdSignal: macdProxy(ch1, ch24),
    fearGreed,
  };
}

/**
 * One CMC quotes call for all gate symbols + shared F&G — avoids 429 from parallel per-symbol fetches.
 * Technicals from Binance daily (labeled) on scan path; full historical only on single /evaluate.
 * @param {string[]} symbols
 */
export async function fetchGateSnapshotsBatch(symbols) {
  const syms = symbols.map((s) => s.toUpperCase());
  const symParam = syms.join(",");
  const [quotes, fgRes] = await Promise.all([
    cmcFetch(
      "/v1/cryptocurrency/quotes/latest",
      { symbol: symParam },
      { cacheKey: `quotes:batch:${symParam}` },
    ),
    cmcFetch("/v3/fear-and-greed/latest", {}, { cacheKey: "fg:latest" }),
  ]);
  const fearGreed = fgRes.data?.value ?? 50;

  /** @type {Record<string, { snapshot: object; sources: Record<string, string | number | null>; cmcLive: boolean }>} */
  const out = {};

  await Promise.all(
    syms.map(async (sym) => {
      const row = quotes.data?.[sym];
      if (!row) return;
      const base = quoteRowToSnapshot(sym, row, fearGreed);
      /** @type {Record<string, string | number | null>} */
      const sources = {
        price: "coinmarketcap/quotes/latest",
        marketCap: "coinmarketcap/quotes/latest",
        volume24h: "coinmarketcap/quotes/latest",
        change1h: "coinmarketcap/quotes/latest",
        change24h: "coinmarketcap/quotes/latest",
        change7d: "coinmarketcap/quotes/latest",
        change30d: "coinmarketcap/quotes/latest",
        volumeChange24h: "coinmarketcap/quotes/latest",
        cmcRank: "coinmarketcap/quotes/latest",
        fdv: "coinmarketcap/quotes/latest",
        fearGreed: "coinmarketcap/fear-and-greed/latest",
        rsi: "binance-spot-daily-14rsi",
        macd: "binance-spot-daily-derived",
        historicalBars: null,
      };
      try {
        const venue = await hydrateTechnicalsFromBinance(sym, base);
        if (venue) {
          sources.rsi = venue.sourceRsi;
          sources.macd = venue.sourceMacd;
          sources.historicalBars = venue.bars;
          if (venue.sourceVolatility) sources.volatility = venue.sourceVolatility;
          out[sym] = {
            snapshot: { ...base, rsi: venue.rsi, macdSignal: venue.macdSignal },
            sources,
            cmcLive: true,
            volatility: venue.volatility ?? null,
          };
          return;
        }
      } catch {
        /* quotes-only */
      }
      out[sym] = { snapshot: base, sources, cmcLive: true };
    }),
  );

  return out;
}

/**
 * @param {string} symbol
 * @returns {Promise<import("../engine/nexus-gate.mjs").CmcTokenSnapshot>}
 */
export async function fetchLiveSnapshot(symbol) {
  const sym = symbol.toUpperCase();
  const [quotes, fgRes] = await Promise.all([
    cmcFetch("/v1/cryptocurrency/quotes/latest", { symbol: sym }, { cacheKey: `quotes:${sym}` }),
    cmcFetch("/v3/fear-and-greed/latest", {}, { cacheKey: "fg:latest" }),
  ]);

  const row = quotes.data?.[sym];
  if (!row) throw new Error(`No quote for ${sym}`);
  return quoteRowToSnapshot(sym, row, fgRes.data?.value ?? 50);
}

export async function fetchHistoricalDaily(id, days) {
  const count = Math.min(Math.max(days, 30), 365);
  const params = { id: String(id), count: String(count), interval: "daily" };
  try {
    return await cmcFetch("/v3/cryptocurrency/quotes/historical", params);
  } catch (e) {
    const msg = e.message || String(e);
    if (!msg.includes("404") && !msg.includes("not found")) throw e;
    return cmcFetch("/v2/cryptocurrency/quotes/historical", params);
  }
}

/** Plan + usage from CMC — helps verify Pro/Standard activation on same key. */
export async function fetchKeyInfo() {
  if (!cmcKey()) return null;
  try {
    const data = await cmcFetch("/v1/key/info", {}, { cacheKey: "key:info" });
    const plan = data.data?.plan ?? {};
    const usage = data.data?.usage ?? {};
    return {
      creditLimitMonthly: plan.credit_limit_monthly ?? null,
      rateLimitMinute: plan.rate_limit_minute ?? null,
      creditsUsedMonth: usage.current_month?.credits_used ?? null,
      creditsLeftMonth: usage.current_month?.credits_left ?? null,
      resetAt: plan.credit_limit_monthly_reset_timestamp ?? null,
      historicalRest: "unknown",
    };
  } catch {
    return null;
  }
}

/** CMC global metrics for regime / derivatives-positioning proxy. */
export async function fetchGlobalMacro() {
  try {
    const data = await cmcFetch("/v1/global-metrics/quotes/latest", {}, { cacheKey: "global:latest" });
    const usd = data.data?.quote?.USD ?? {};
    const btcDom = data.data?.btc_dominance ?? null;
    const mktCh =
      usd.total_market_cap_yesterday != null && usd.total_market_cap
        ? ((usd.total_market_cap - usd.total_market_cap_yesterday) / usd.total_market_cap_yesterday) * 100
        : (usd.total_market_cap_change_24h ?? null);
    const altCh =
      usd.altcoin_market_cap_yesterday != null && usd.altcoin_market_cap
        ? ((usd.altcoin_market_cap - usd.altcoin_market_cap_yesterday) / usd.altcoin_market_cap_yesterday) * 100
        : null;
    return {
      btcDominance: btcDom != null ? Number(btcDom) : null,
      totalMarketCap: usd.total_market_cap ?? null,
      totalMarketChange24h: mktCh != null ? Number(mktCh) : null,
      altcoinMarketCap: usd.altcoin_market_cap ?? null,
      altcoinMarketCapChange24h: altCh != null ? Number(altCh) : null,
      source: "coinmarketcap/global-metrics/quotes/latest",
    };
  } catch {
    return { source: "unavailable" };
  }
}
