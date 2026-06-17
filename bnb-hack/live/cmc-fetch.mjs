/**
 * CoinMarketCap Pro REST helpers (Basic plan: quotes + fear/greed).
 * Server-side TTL cache saves credits and improves permit latency.
 */

const API = "https://pro-api.coinmarketcap.com";

const TTL_MS = { fearGreed: 60_000, quotes: 30_000, map: 300_000 };
/** @type {Map<string, { at: number; data: unknown }>} */
const cache = new Map();

function cacheGet(key) {
  const row = cache.get(key);
  if (!row) return null;
  const ttl = key.startsWith("fg:") ? TTL_MS.fearGreed : key.startsWith("map:") ? TTL_MS.map : TTL_MS.quotes;
  if (Date.now() - row.at > ttl) {
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

/** RSI proxy when historical bars unavailable (Basic plan). */
export function rsiProxy(change24h, change7d) {
  const momentum = change24h * 0.6 + (change7d ?? 0) * 0.4;
  return Math.round(Math.min(78, Math.max(22, 50 + momentum * 0.85)) * 10) / 10;
}

export function macdProxy(change1h, change24h) {
  if (change1h > 1.5 && change24h > 0) return "bullish";
  if (change1h < -1.5 && change24h < 0) return "bearish";
  return "neutral";
}

/**
 * @param {string} symbol
 * @returns {Promise<import("../engine/nexus-gate.mjs").CmcTokenSnapshot>}
 */
export async function fetchLiveSnapshot(symbol) {
  const sym = symbol.toUpperCase();
  const [quotes, fgRes] = await Promise.all([
    cmcFetch("/v1/cryptocurrency/quotes/latest", { symbol: sym }, { cacheKey: `quotes:${sym}` }),
    cmcFetch("/v3/fear-and-greed/latest", {}, { cacheKey: "fg:latest" }).catch(() => ({
      data: { value: 50 },
    })),
  ]);

  const row = quotes.data?.[sym];
  if (!row) throw new Error(`No quote for ${sym}`);
  const usd = row.quote?.USD ?? {};
  const ch1 = usd.percent_change_1h ?? 0;
  const ch24 = usd.percent_change_24h ?? 0;
  const ch7 = usd.percent_change_7d ?? 0;

  return {
    symbol: sym,
    price: usd.price ?? 0,
    marketCap: usd.market_cap ?? 0,
    volume24h: usd.volume_24h ?? 0,
    change1h: ch1,
    change24h: ch24,
    change7d: ch7,
    rsi: rsiProxy(ch24, ch7),
    macdSignal: macdProxy(ch1, ch24),
    fearGreed: fgRes.data?.value ?? 50,
  };
}

export async function fetchHistoricalDaily(id, days) {
  const count = Math.min(Math.max(days, 30), 365);
  return cmcFetch("/v2/cryptocurrency/quotes/historical", {
    id: String(id),
    count: String(count),
    interval: "daily",
  });
}
