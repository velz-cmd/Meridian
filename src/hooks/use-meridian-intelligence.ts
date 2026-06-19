"use client";

import { useCallback, useEffect, useState } from "react";
import type { MeridianIntelligencePayload } from "@/lib/meridian-intelligence-types";

export function useMeridianIntelligence(symbol: string, refreshMs = 120_000) {
  const [data, setData] = useState<MeridianIntelligencePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meridian/intelligence?symbol=${symbol}`, { cache: "no-store" });
      const json = (await res.json()) as MeridianIntelligencePayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Intelligence failed");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    void reload();
    const id = window.setInterval(() => void reload(), refreshMs);
    return () => window.clearInterval(id);
  }, [reload, refreshMs]);

  return { data, loading, error, reload };
}
