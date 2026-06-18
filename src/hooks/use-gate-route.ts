"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GateRoutePayload, GateRouteResponse } from "@/lib/gate-route-types";

export function useGateRoute(refreshMs = 60_000) {
  const [route, setRoute] = useState<GateRoutePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const req = useRef(0);

  const load = useCallback(async () => {
    const id = ++req.current;
    setLoading(true);
    try {
      const res = await fetch("/api/gate/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store",
      });
      const data = (await res.json()) as GateRouteResponse;
      if (id !== req.current) return;
      if (res.ok && data.route) setRoute(data.route);
    } catch {
      if (id === req.current) setRoute(null);
    } finally {
      if (id === req.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), refreshMs);
    return () => clearInterval(t);
  }, [load, refreshMs]);

  return { route, loading, reload: load };
}
