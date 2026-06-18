"use client";

import { useCallback, useEffect, useState } from "react";
import type { PositionRoute } from "@/lib/position-router";

export function usePositionRoute(
  symbol?: string,
  opts?: { hasPosition?: boolean; agentAction?: string; intervalMs?: number },
) {
  const [route, setRoute] = useState<PositionRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!symbol) {
      setRoute(null);
      setLoading(false);
      return;
    }
    try {
      const qs = new URLSearchParams({ symbol });
      if (opts?.hasPosition) qs.set("hasPosition", "1");
      if (opts?.agentAction) qs.set("agent", opts.agentAction);
      const res = await fetch(`/api/nexus/position-route?${qs}`, { cache: "no-store" });
      const data = (await res.json()) as PositionRoute & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Route unavailable");
      setRoute(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Route failed");
    } finally {
      setLoading(false);
    }
  }, [symbol, opts?.hasPosition, opts?.agentAction]);

  useEffect(() => {
    setLoading(true);
    void reload();
    const ms = opts?.intervalMs ?? 90_000;
    const id = window.setInterval(() => void reload(), ms);
    return () => window.clearInterval(id);
  }, [reload, opts?.intervalMs]);

  return { route, loading, error, reload };
}
