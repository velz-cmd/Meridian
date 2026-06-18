/**
 * Public Binance USD-M futures context — read-only macro for direction desk.
 * Not execution; MERIDIAN settles on BSC Testnet spot via PancakeSwap.
 */

export type BinanceDerivativesSnapshot = {
  symbol: string;
  markPrice: number;
  fundingRate: number;
  fundingRatePct: string;
  nextFundingTime: number | null;
  openInterest: number | null;
  openInterestUsd: number | null;
  source: string;
  fetchedAt: string;
};

const CACHE = { at: 0, data: null as BinanceDerivativesSnapshot | null };
const TTL_MS = 60_000;

function mapSymbol(symbol: string): string {
  const s = symbol.toUpperCase().replace(/^\$/, "");
  if (s === "BNB") return "BNBUSDT";
  if (s.endsWith("USDT")) return s;
  return `${s}USDT`;
}

export async function fetchBinanceDerivativesContext(symbol = "BNB"): Promise<BinanceDerivativesSnapshot | null> {
  if (Date.now() - CACHE.at < TTL_MS && CACHE.data?.symbol === mapSymbol(symbol)) {
    return CACHE.data;
  }

  const pair = mapSymbol(symbol);
  try {
    const [premRes, oiRes] = await Promise.all([
      fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${pair}`, {
        next: { revalidate: 60 },
        headers: { Accept: "application/json" },
      }),
      fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${pair}`, {
        next: { revalidate: 60 },
        headers: { Accept: "application/json" },
      }),
    ]);

    if (!premRes.ok) return null;

    const prem = (await premRes.json()) as {
      symbol?: string;
      markPrice?: string;
      lastFundingRate?: string;
      nextFundingTime?: number;
    };

    let openInterest: number | null = null;
    if (oiRes.ok) {
      const oi = (await oiRes.json()) as { openInterest?: string };
      openInterest = oi.openInterest ? Number(oi.openInterest) : null;
    }

    const mark = Number(prem.markPrice ?? 0);
    const fr = Number(prem.lastFundingRate ?? 0);

    const snap: BinanceDerivativesSnapshot = {
      symbol: pair,
      markPrice: mark,
      fundingRate: fr,
      fundingRatePct: `${(fr * 100).toFixed(4)}%`,
      nextFundingTime: prem.nextFundingTime ?? null,
      openInterest,
      openInterestUsd: openInterest != null && mark > 0 ? openInterest * mark : null,
      source: "binance-fapi/public",
      fetchedAt: new Date().toISOString(),
    };

    CACHE.at = Date.now();
    CACHE.data = snap;
    return snap;
  } catch {
    return null;
  }
}

/** Funding tilt for direction — positive funding = longs pay = crowded long side */
export function fundingDirectionBias(fr: number): "long_crowded" | "short_crowded" | "neutral" {
  if (fr > 0.0001) return "long_crowded";
  if (fr < -0.00005) return "short_crowded";
  return "neutral";
}
