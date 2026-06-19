/**
 * Volatility compression / expansion from daily OHLC (Binance venue) or close-only (CMC historical).
 * Used by meridian-skills — not decorative UI metrics.
 */

/**
 * @param {{ high: number; low: number; price: number }[]} bars
 */
export function computeVolatilityFromOhlcBars(bars) {
  if (!bars || bars.length < 16) return null;

  const trs = [];
  for (let i = 1; i < bars.length; i++) {
    const cur = bars[i];
    const prev = bars[i - 1];
    const h = cur.high ?? cur.price;
    const l = cur.low ?? cur.price;
    const pc = prev.price;
    const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    trs.push(tr);
  }

  const atr = (n) => {
    if (trs.length < n) return null;
    const slice = trs.slice(-n);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  };

  const atr5 = atr(5);
  const atr14 = atr(14);
  const close = bars[bars.length - 1].price;
  if (!atr5 || !atr14 || close <= 0) return null;

  const atrPct = (atr14 / close) * 100;
  const compressionRatio = atr5 / atr14;

  const ranges = bars.slice(-20).map((b) => {
    const h = b.high ?? b.price;
    const l = b.low ?? b.price;
    return h > 0 && l > 0 ? ((h - l) / b.price) * 100 : 0;
  });
  const lastRange = ranges[ranges.length - 1] ?? 0;
  const avgRange = ranges.reduce((a, b) => a + b, 0) / Math.max(ranges.length, 1);
  const rangePercentile =
    ranges.filter((r) => r <= lastRange).length / Math.max(ranges.length, 1);

  const squeeze = compressionRatio < 0.72 && rangePercentile < 0.35 && atrPct < 8;
  const expansion = compressionRatio > 1.35 || (lastRange > avgRange * 1.6 && atrPct > 6);

  let state = "neutral";
  if (squeeze) state = "compression";
  else if (expansion) state = "expansion";

  return {
    atr5,
    atr14,
    atrPct: Math.round(atrPct * 100) / 100,
    compressionRatio: Math.round(compressionRatio * 1000) / 1000,
    rangePct: Math.round(lastRange * 100) / 100,
    rangePercentile: Math.round(rangePercentile * 100),
    squeeze,
    expansion,
    state,
    bars: bars.length,
    source: "binance-spot-daily-ohlc",
  };
}

/** Close-only fallback when OHLC unavailable (CMC historical daily). */
export function computeVolatilityFromCloses(closes) {
  if (!closes || closes.length < 16) return null;

  const rets = [];
  for (let i = 1; i < closes.length; i++) {
    const p0 = closes[i - 1];
    const p1 = closes[i];
    if (p0 > 0) rets.push(Math.abs((p1 - p0) / p0));
  }

  const avg = (arr, n) => {
    const slice = arr.slice(-n);
    if (slice.length < n) return null;
    return slice.reduce((a, b) => a + b, 0) / n;
  };

  const vol5 = avg(rets, 5);
  const vol14 = avg(rets, 14);
  const close = closes[closes.length - 1];
  if (!vol5 || !vol14 || close <= 0) return null;

  const atrPct = vol14 * 100;
  const compressionRatio = vol5 / vol14;
  const squeeze = compressionRatio < 0.75 && atrPct < 6;
  const expansion = compressionRatio > 1.4 || atrPct > 9;

  return {
    atr5: vol5 * close,
    atr14: vol14 * close,
    atrPct: Math.round(atrPct * 100) / 100,
    compressionRatio: Math.round(compressionRatio * 1000) / 1000,
    rangePct: Math.round(Math.abs(rets[rets.length - 1] ?? 0) * 10000) / 100,
    rangePercentile: 50,
    squeeze,
    expansion,
    state: squeeze ? "compression" : expansion ? "expansion" : "neutral",
    bars: closes.length,
    source: "cmc-historical-daily-closes",
  };
}
