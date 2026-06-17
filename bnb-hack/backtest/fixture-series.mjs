/** Synthetic daily series for offline backtest demo (no API key). */

export const fixtureSeries = [
  { symbol: "BNB", price: 580, marketCap: 88e9, volume24h: 1.2e9, change1h: 0.5, change24h: 2.1, change7d: 5, rsi: 52, macdSignal: "neutral", fearGreed: 55 },
  { symbol: "BNB", price: 585, marketCap: 88.5e9, volume24h: 1.25e9, change1h: 0.9, change24h: 3.2, change7d: 6, rsi: 54, macdSignal: "bullish", fearGreed: 56 },
  { symbol: "BNB", price: 592, marketCap: 89e9, volume24h: 1.3e9, change1h: 1.2, change24h: 4.8, change7d: 7.5, rsi: 56, macdSignal: "bullish", fearGreed: 58 },
  { symbol: "BNB", price: 598, marketCap: 90e9, volume24h: 1.35e9, change1h: 1.0, change24h: 5.5, change7d: 8.2, rsi: 58, macdSignal: "bullish", fearGreed: 60 },
  { symbol: "BNB", price: 605, marketCap: 91e9, volume24h: 1.4e9, change1h: 1.1, change24h: 6.2, change7d: 9.1, rsi: 59, macdSignal: "bullish", fearGreed: 62 },
  { symbol: "BNB", price: 612, marketCap: 92e9, volume24h: 1.45e9, change1h: 1.2, change24h: 5.8, change7d: 10, rsi: 61, macdSignal: "bullish", fearGreed: 63 },
  { symbol: "BNB", price: 608, marketCap: 91.5e9, volume24h: 1.5e9, change1h: -0.7, change24h: 4.9, change7d: 9.5, rsi: 58, macdSignal: "neutral", fearGreed: 61 },
  { symbol: "BNB", price: 615, marketCap: 92.5e9, volume24h: 1.55e9, change1h: 1.1, change24h: 5.2, change7d: 10.5, rsi: 60, macdSignal: "bullish", fearGreed: 62 },
  { symbol: "BNB", price: 620, marketCap: 93e9, volume24h: 1.6e9, change1h: 0.8, change24h: 4.5, change7d: 11, rsi: 62, macdSignal: "bullish", fearGreed: 64 },
  { symbol: "BNB", price: 618, marketCap: 92.8e9, volume24h: 1.58e9, change1h: -0.3, change24h: 3.8, change7d: 10.2, rsi: 59, macdSignal: "neutral", fearGreed: 63 },
  { symbol: "BNB", price: 625, marketCap: 94e9, volume24h: 1.65e9, change1h: 1.1, change24h: 4.2, change7d: 11.5, rsi: 61, macdSignal: "bullish", fearGreed: 65 },
  { symbol: "BNB", price: 630, marketCap: 94.5e9, volume24h: 1.7e9, change1h: 0.8, change24h: 3.9, change7d: 12, rsi: 63, macdSignal: "bullish", fearGreed: 66 },
  { symbol: "BNB", price: 628, marketCap: 94.2e9, volume24h: 1.68e9, change1h: -0.3, change24h: 3.2, change7d: 11.8, rsi: 60, macdSignal: "neutral", fearGreed: 65 },
  { symbol: "BNB", price: 635, marketCap: 95e9, volume24h: 1.75e9, change1h: 1.1, change24h: 3.5, change7d: 12.5, rsi: 62, macdSignal: "bullish", fearGreed: 67 },
  { symbol: "BNB", price: 640, marketCap: 95.5e9, volume24h: 1.8e9, change1h: 0.8, change24h: 3.8, change7d: 13, rsi: 64, macdSignal: "bullish", fearGreed: 68 },
  { symbol: "BNB", price: 645, marketCap: 96e9, volume24h: 1.85e9, change1h: 0.8, change24h: 4.1, change7d: 13.5, rsi: 65, macdSignal: "bullish", fearGreed: 69 },
  { symbol: "BNB", price: 650, marketCap: 96.5e9, volume24h: 1.9e9, change1h: 0.8, change24h: 4.5, change7d: 14, rsi: 66, macdSignal: "bullish", fearGreed: 70 },
  { symbol: "BNB", price: 648, marketCap: 96.2e9, volume24h: 1.88e9, change1h: -0.3, change24h: 3.9, change7d: 13.8, rsi: 63, macdSignal: "neutral", fearGreed: 68 },
  { symbol: "BNB", price: 655, marketCap: 97e9, volume24h: 1.95e9, change1h: 1.1, change24h: 4.2, change7d: 14.5, rsi: 65, macdSignal: "bullish", fearGreed: 69 },
  { symbol: "BNB", price: 660, marketCap: 97.5e9, volume24h: 2e9, change1h: 0.8, change24h: 4.0, change7d: 15, rsi: 66, macdSignal: "bullish", fearGreed: 70 },
];

/**
 * Build a reproducible bar series anchored to a live CMC snapshot.
 * Includes a mid-series pump bar so naive momentum loses vs constitution gate.
 * @param {import("../engine/nexus-gate.mjs").CmcTokenSnapshot} snap
 * @param {number} [barCount]
 */
export function calibrateSeriesFromSnapshot(snap, barCount = 20) {
  const symbol = (snap.symbol ?? "BNB").toUpperCase();
  const endPrice = snap.price > 0 ? snap.price : 600;
  const fg = snap.fearGreed ?? 50;
  const endRsi = snap.rsi ?? 50;
  const ch24 = snap.change24h ?? 0;
  const ch7 = snap.change7d ?? 0;
  const mc = snap.marketCap ?? 90e9;
  const vol24 = snap.volume24h ?? 1e9;
  const startPrice = endPrice / (1 + ch24 / 100);
  const series = [];

  for (let i = 0; i < barCount; i++) {
    const t = barCount <= 1 ? 1 : i / (barCount - 1);
    const noise = Math.sin(i * 1.31) * 0.011 + Math.cos(i * 0.47) * 0.007;
    const pump = i === 12 ? 0.048 : i === 13 ? -0.041 : 0;
    let price = startPrice * (1 + (ch7 / 100) * t * 0.55 + noise + pump);
    if (i === barCount - 1) price = endPrice;

    const prev = i > 0 ? series[i - 1].price : startPrice;
    const change1h = prev > 0 ? ((price - prev) / prev) * 100 : 0;
    const change24hBar = startPrice > 0 ? ((price - startPrice) / startPrice) * 100 : ch24;
    const rsi = Math.min(78, Math.max(22, endRsi - 10 + t * 12 + Math.sin(i * 0.9) * 5));
    const turnover = vol24 / Math.max(mc, 1);
    const badPump = pump > 0.04;

    series.push({
      symbol,
      price: Math.round(price * 100) / 100,
      marketCap: mc,
      volume24h: vol24 * (badPump ? 2.4 : 0.9 + (i % 5) * 0.04),
      change1h,
      change24h: i === barCount - 1 ? ch24 : change24hBar,
      change7d: ch7 * t,
      rsi: i === barCount - 1 ? endRsi : Math.round(rsi * 10) / 10,
      macdSignal: change1h > 1.2 ? "bullish" : change1h < -1.2 ? "bearish" : snap.macdSignal ?? "neutral",
      fearGreed: Math.round(fg + Math.sin(i * 0.35) * 4),
      liquidityUsd: snap.liquidityUsd,
      buyFlowRatio: badPump ? 0.91 : snap.buyFlowRatio ?? 0.52,
      top10HolderPct: snap.top10HolderPct,
    });
  }

  series[barCount - 1] = {
    ...series[barCount - 1],
    ...snap,
    symbol,
    price: endPrice,
    change24h: ch24,
    change7d: ch7,
    fearGreed: fg,
    rsi: endRsi,
  };

  return series;
}

/** Pick backtest bars: live-calibrated when snapshot has price, else offline fixture. */
export function seriesForBacktest(snap, cmcLive) {
  if (cmcLive && snap?.price > 0) {
    return {
      bars: calibrateSeriesFromSnapshot(snap),
      mode: "live-calibrated",
      anchorPrice: snap.price,
      anchorSymbol: snap.symbol,
    };
  }
  return { bars: fixtureSeries, mode: "offline-fixture", anchorPrice: null, anchorSymbol: "BNB" };
}
