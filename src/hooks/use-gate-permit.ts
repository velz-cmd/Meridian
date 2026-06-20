"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GateArbitration = {
  agent: { action: string; confidence: number; reasoning?: string };
  gate: { confidence: number; edge: number; signal: string; regime?: string };
  gap: number;
  vetoed: boolean;
  verdict: "GRANT" | "DENY";
  execute: string;
  permitId: string;
  narrative: string;
};

export type GatePermitState = {
  permitId: string | null;
  permitStatus: "GRANT" | "DENY" | null;
  arbitration: GateArbitration | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

type EvaluatePayload = {
  permit?: { permitId: string; status: "GRANT" | "DENY"; execute?: string } | null;
  arbitration?: GateArbitration;
  error?: string;
};

/** Live constitution permit + agent arbitration for Gate settlement surfaces. */
export function useGatePermit(symbol: string, refreshMs = 120_000): GatePermitState {
  const [permitId, setPermitId] = useState<string | null>(null);
  const [permitStatus, setPermitStatus] = useState<"GRANT" | "DENY" | null>(null);
  const [arbitration, setArbitration] = useState<GateArbitration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const req = useRef(0);

  const load = useCallback(async () => {
    const sym = symbol.replace(/^\$/, "").trim().toUpperCase();
    if (!sym) return;
    const id = ++req.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        symbol: sym,
        agentAction: "BUY",
        confidence: "85",
      });
      const res = await fetch(`/api/gate/evaluate?${params.toString()}`, { cache: "no-store" });
      const data = (await res.json()) as EvaluatePayload;
      if (id !== req.current) return;
      if (!res.ok) throw new Error(data.error ?? `Gate permit failed (${res.status})`);
      setPermitId(data.permit?.permitId ?? null);
      setPermitStatus(data.permit?.status ?? null);
      setArbitration(data.arbitration ?? null);
    } catch (e) {
      if (id !== req.current) return;
      setPermitId(null);
      setPermitStatus(null);
      setArbitration(null);
      setError(e instanceof Error ? e.message : "Gate permit failed");
    } finally {
      if (id === req.current) setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    void load();
    if (refreshMs <= 0) return;
    const t = window.setInterval(() => void load(), refreshMs);
    return () => window.clearInterval(t);
  }, [load, refreshMs]);

  return { permitId, permitStatus, arbitration, loading, error, reload: load };
}
