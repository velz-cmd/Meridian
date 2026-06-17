/**
 * Binance spot daily klines — public API, no key.
 * Used ONLY when CMC historical unavailable (Basic plan).
 * Backtest replays constitution rules on execution-venue prices; live gate stays CMC.
 */

const BINANCE = "https://api.binance.com/api/v3";

/** @type {Record<string, string>} */
export const GATE_BINANCE_SYMBOLS = {
  BNB: "BNBUSDT",
  CAKE: "CAKEUSDT",
};

/**
 * @param {string} symbol BNB | CAKE
 * @param {number} days
 */
export async function fetchBinanceDailySeries(symbol, days = 90) {
  const pair = GATE_BINANCE_SYMBOLS[symbol.toUpperCase()];
  if (!pair) throw new Error(`No Binance pair for ${symbol}`);

  const limit = Math.min(Math.max(days + 15, 30), 1000);
  const res = await fetch(`${BINANCE}/klines?symbol=${pair}&interval=1d&limit=${limit}`);
  if (!res.ok) throw new Error(`Binance klines ${res.status}`);

  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length < 20) {
    throw new Error(`Insufficient Binance bars for ${symbol}`);
  }

  return rows.map((row, i) => {
    const open = parseFloat(row[1]);
    const close = parseFloat(row[4]);
    const volume = parseFloat(row[5]);
    const prev = i > 0 ? parseFloat(rows[i - 1][4]) : open;
    const change24h = prev > 0 ? ((close - prev) / prev) * 100 : 0;
    return {
      time: new Date(row[0]).toISOString().slice(0, 10),
      price: close,
      volume24h: volume * close,
      marketCap: 0,
      change24h,
      change7d: 0,
      change1h: 0,
    };
  });
}
