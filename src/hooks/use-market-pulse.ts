"use client";

import { useCallback, useEffect, useState } from "react";
import type { MarketPulse } from "@/lib/market-pulse";

export function useMarketPulse(symbol?: string, intervalMs = 90_000) {
  const [pulse, setPulse] = useState<MarketPulse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const qs = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
      const res = await fetch(`/api/nexus/market-pulse${qs}`, { cache: "no-store" });
      const data = (await res.json()) as MarketPulse & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Pulse unavailable");
      setPulse(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pulse failed");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    setLoading(true);
    void reload();
    const id = window.setInterval(() => void reload(), intervalMs);
    return () => window.clearInterval(id);
  }, [reload, intervalMs]);

  return { pulse, loading, error, reload };
}
