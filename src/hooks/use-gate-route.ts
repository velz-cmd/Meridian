"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GateBenchmarkFull, GateRoutePayload, GateRouteResponse } from "@/lib/gate-route-types";

/** Single /api/gate/route poll — batched CMC, no duplicate per-symbol evaluate calls. */
export function useGateRoute(refreshMs = 180_000) {
  const [route, setRoute] = useState<GateRoutePayload | null>(null);
  const [benchmarks, setBenchmarks] = useState<GateBenchmarkFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  const req = useRef(0);

  const load = useCallback(async () => {
    const id = ++req.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gate/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store",
      });
      const data = (await res.json()) as GateRouteResponse & {
        error?: string;
        degraded?: boolean;
        cacheNote?: string;
      };
      if (id !== req.current) return;
      if (res.ok && data.route) setRoute(data.route);
      if (res.ok && data.benchmarks?.length) setBenchmarks(data.benchmarks);
      setDegraded(Boolean(data.degraded));
      if (!res.ok) {
        setError(data.error ?? `Gate route failed (${res.status})`);
      } else if (data.degraded && data.cacheNote) {
        setError(data.cacheNote);
      } else {
        setError(null);
      }
    } catch {
      if (id === req.current) {
        setError("Could not reach gate API");
      }
    } finally {
      if (id === req.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), refreshMs);
    return () => clearInterval(t);
  }, [load, refreshMs]);

  return { route, benchmarks, loading, error, degraded, reload: load };
}
