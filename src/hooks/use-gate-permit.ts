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

/** Live constitution permit receipt — no synthetic agent unless explicitly requested. */
export function useGatePermit(
  symbol: string,
  refreshMs = 120_000,
  opts?: { enabled?: boolean; agentAction?: "BUY" | "SELL" | "HOLD"; agentConfidence?: number },
): GatePermitState {
  const enabled = opts?.enabled !== false;
  const [permitId, setPermitId] = useState<string | null>(null);
  const [permitStatus, setPermitStatus] = useState<"GRANT" | "DENY" | null>(null);
  const [arbitration, setArbitration] = useState<GateArbitration | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const req = useRef(0);

  const load = useCallback(async () => {
    if (!enabled) {
      setPermitId(null);
      setPermitStatus(null);
      setArbitration(null);
      setLoading(false);
      setError(null);
      return;
    }

    const sym = symbol.replace(/^\$/, "").trim().toUpperCase();
    if (!sym) return;
    const id = ++req.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ symbol: sym });
      if (opts?.agentAction) {
        params.set("agentAction", opts.agentAction);
        if (opts.agentConfidence != null) params.set("confidence", String(opts.agentConfidence));
      }
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
  }, [symbol, enabled, opts?.agentAction, opts?.agentConfidence]);

  useEffect(() => {
    void load();
    if (!enabled || refreshMs <= 0) return;
    const t = window.setInterval(() => void load(), refreshMs);
    return () => window.clearInterval(t);
  }, [load, refreshMs, enabled]);

  return { permitId, permitStatus, arbitration, loading, error, reload: load };
}
