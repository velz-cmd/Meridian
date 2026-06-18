"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GateBoardRow } from "@/components/gate/gate-strategy-board";
import type { GateRoutePayload, GateRouteResponse } from "@/lib/gate-route-types";

function toBoardRows(benchmarks: GateRouteResponse["benchmarks"]): GateBoardRow[] {
  if (!benchmarks?.length) return [];
  return benchmarks.map((b) => ({
    symbol: b.symbol,
    gate: {
      signal: b.gate.signal,
      tier: b.gate.tier,
      regime: b.gate.regime,
      confidence: b.gate.confidence,
      edge: b.gate.edge,
      checksPassed: b.gate.checksPassed,
      checksTotal: b.gate.checksTotal,
      gaps: b.gate.gaps,
    },
    market: { price: b.market.price, change24h: b.market.change24h },
    skills: b.skills
      ? { alignmentScore: b.skills.composite?.alignmentScore, compositeSignal: b.skills.composite?.signal }
      : undefined,
  }));
}

export function useGateRoute(refreshMs = 60_000) {
  const [route, setRoute] = useState<GateRoutePayload | null>(null);
  const [benchmarks, setBenchmarks] = useState<GateBoardRow[]>([]);
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
      if (res.ok && data.benchmarks?.length) setBenchmarks(toBoardRows(data.benchmarks));
    } catch {
      if (id === req.current) {
        setRoute(null);
        setBenchmarks([]);
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

  return { route, benchmarks, loading, reload: load };
}
