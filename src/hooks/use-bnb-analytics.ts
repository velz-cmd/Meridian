"use client";

import { useCallback, useEffect, useState } from "react";
import type { BnbAnalyticsPayload } from "@/lib/bnb-analytics-types";

export function useBnbAnalytics(refreshMs = 30_000) {
  const [data, setData] = useState<BnbAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bnb/analytics", { cache: "no-store" });
      const json = (await res.json()) as BnbAnalyticsPayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analytics failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const id = window.setInterval(() => void reload(), refreshMs);
    return () => window.clearInterval(id);
  }, [reload, refreshMs]);

  return { data, loading, error, reload };
}
