"use client";

import { useEffect, useState } from "react";

const FALLBACK_BNB_USD = 600;

/** Live BNB/USD for converting tBNB spend → USD notional → token amounts */
export function useBnbSpotUsd() {
  const [priceUsd, setPriceUsd] = useState(FALLBACK_BNB_USD);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/market/bnb-price", { cache: "no-store" });
        const data = (await res.json()) as { priceUsd?: number };
        if (!cancelled && res.ok && (data.priceUsd ?? 0) > 0) {
          setPriceUsd(data.priceUsd!);
        }
      } catch {
        /* keep fallback */
      }
    }

    void load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return priceUsd;
}
