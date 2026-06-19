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
