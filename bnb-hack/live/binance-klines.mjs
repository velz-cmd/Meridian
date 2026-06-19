/**
 * Binance spot daily klines — public API, no key.
 * Used ONLY when CMC historical unavailable (Basic plan).
 * Backtest replays constitution rules on execution-venue prices; live gate stays CMC.
 */

const BINANCE_ENDPOINTS = [
  "https://data-api.binance.vision/api/v3",
  "https://api.binance.com/api/v3",
];

/** @type {Record<string, string>} */
export const GATE_BINANCE_SYMBOLS = {
  BNB: "BNBUSDT",
  CAKE: "CAKEUSDT",
  FLOKI: "FLOKIUSDT",
  XVS: "XVSUSDT",
};

function rsi14FromCloses(closes) {
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

function macdProxy(change1h, change24h) {
  if (change1h > 1.5 && change24h > 0) return "bullish";
  if (change1h < -1.5 && change24h < 0) return "bearish";
  return "neutral";
}

/**
 * @param {string} symbol BNB | CAKE
 * @param {number} days
 */
export async function fetchBinanceDailySeries(symbol, days = 90) {
  const pair = GATE_BINANCE_SYMBOLS[symbol.toUpperCase()];
  if (!pair) throw new Error(`No Binance pair for ${symbol}`);

  const limit = Math.min(Math.max(days + 15, 30), 1000);
  let lastErr = "Binance unavailable";

  for (const base of BINANCE_ENDPOINTS) {
    try {
      const res = await fetch(`${base}/klines?symbol=${pair}&interval=1d&limit=${limit}`);
      if (!res.ok) {
        lastErr = `Binance klines ${res.status}`;
        continue;
      }

      const rows = await res.json();
      if (!Array.isArray(rows) || rows.length < 20) {
        lastErr = `Insufficient Binance bars for ${symbol}`;
        continue;
      }

      return rows.map((row, i) => {
        const open = parseFloat(row[1]);
        const close = parseFloat(row[4]);
        const volume = parseFloat(row[5]);
        const prev = i > 0 ? parseFloat(rows[i - 1][4]) : open;
        const p7 = i >= 7 ? parseFloat(rows[i - 7][4]) : null;
        const change24h = prev > 0 ? ((close - prev) / prev) * 100 : 0;
        const change7d = p7 && p7 > 0 ? ((close - p7) / p7) * 100 : 0;
        const ch1 = open > 0 ? ((close - open) / open) * 100 : 0;
        const high = parseFloat(row[2]);
        const low = parseFloat(row[3]);
        return {
          time: new Date(row[0]).toISOString().slice(0, 10),
          price: close,
          high,
          low,
          open,
          volume24h: volume * close,
          marketCap: 0,
          change24h,
          change7d,
          change1h: ch1,
        };
      });
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }

  throw new Error(lastErr);
}

/** Live 24h ticker — venue fallback when CMC rate-limits (no API key). */
export async function fetchBinance24hrTicker(symbol) {
  const pair = GATE_BINANCE_SYMBOLS[symbol.toUpperCase()];
  if (!pair) throw new Error(`No Binance pair for ${symbol}`);
  let lastErr = "Binance ticker unavailable";
  for (const base of BINANCE_ENDPOINTS) {
    try {
      const res = await fetch(`${base}/ticker/24hr?symbol=${pair}`);
      if (!res.ok) {
        lastErr = `Binance ticker ${res.status}`;
        continue;
      }
      const row = await res.json();
      const last = parseFloat(row.lastPrice);
      const ch24 = parseFloat(row.priceChangePercent);
      const ch1 = row.weightedAvgPrice && last
        ? ((last - parseFloat(row.openPrice)) / parseFloat(row.openPrice)) * 100
        : 0;
      return {
        symbol: symbol.toUpperCase(),
        price: last,
        change24h: ch24,
        change1h: ch1,
        change7d: 0,
        change30d: null,
        volume24h: parseFloat(row.quoteVolume),
        marketCap: 0,
        volumeChange24h: null,
        cmcRank: null,
        fdv: null,
      };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(lastErr);
}

/**
 * Batch venue snapshots for gate desk when CMC is unavailable.
 * @param {string[]} symbols
 * @param {number} [fearGreed=50]
 */
export async function fetchVenueGateSnapshotsBatch(symbols, fearGreed = 50) {
  /** @type {Record<string, { snapshot: object; sources: Record<string, string>; cmcLive: boolean }>} */
  const out = {};
  await Promise.all(
    symbols.map(async (sym) => {
      const upper = sym.toUpperCase();
      try {
        const ticker = await fetchBinance24hrTicker(upper);
        let rsi = 50;
        let macdSignal = "neutral";
        try {
          const bars = await fetchBinanceDailySeries(upper, 30);
          const closes = bars.map((b) => b.price);
          rsi = rsi14FromCloses(closes) ?? 50;
          const last = bars[bars.length - 1];
          const prev = bars[bars.length - 2];
          const ch1 =
            prev?.price && last?.price ? ((last.price - prev.price) / prev.price) * 100 : ticker.change1h;
          macdSignal = macdProxy(ch1, ticker.change24h);
        } catch {
          /* ticker-only */
        }
        out[upper] = {
          snapshot: {
            ...ticker,
            rsi,
            macdSignal,
            fearGreed,
          },
          sources: {
            price: "binance-spot/ticker-24hr",
            change24h: "binance-spot/ticker-24hr",
            change1h: "binance-spot/ticker-24hr",
            volume24h: "binance-spot/ticker-24hr",
            fearGreed: "default-neutral",
            rsi: "binance-spot-daily-14rsi",
            macd: "binance-spot-daily-derived",
          },
          cmcLive: false,
        };
      } catch {
        /* skip symbol */
      }
    }),
  );
  if (Object.keys(out).length === 0) throw new Error("Binance venue fallback returned no gate quotes");
  return out;
}
