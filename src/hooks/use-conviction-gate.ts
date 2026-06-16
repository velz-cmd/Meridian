"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentSignal } from "@/lib/storage";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

export type ConvictionCheck = {
  id: string;
  pass: boolean;
  weight: number;
  label: string;
};

export type ConvictionPayload = {
  schema: string;
  symbol: string;
  dataSource: "cmc+desk" | "desk-only";
  cmcLive: boolean;
  gate: {
    signal: string;
    tier: string;
    confidence: number;
    risk: number;
    agreement: number;
    checks: ConvictionCheck[];
    checksPassed: number;
    checksTotal: number;
    thesis: string;
    agentDirective: string;
    gaps: string[];
    inputs?: Record<string, number | string | null>;
  };
  veto: {
    finalAction: string;
    overridden: boolean;
    agentInput?: { action: string; confidence?: number };
    reasoning?: string;
  } | null;
  backtest: {
    totalReturnPct: number;
    maxDrawdownPct: number;
    winRatePct: number;
    roundTrips: number;
  } | null;
};

function overlayFromToken(token: TrendingMarketToken) {
  const pc = token.priceChange;
  const buys = token.txns24h?.buys ?? token.intel?.buy24h ?? 0;
  const sells = token.txns24h?.sells ?? token.intel?.sell24h ?? 1;
  const flow = buys + sells > 0 ? buys / (buys + sells) : undefined;
  const ta = token.intel?.technical;
  return {
    priceUsd: token.priceUsd,
    change24h: token.change24h,
    change1h: pc?.h1,
    change7d: pc?.h6,
    volume24h: token.volume24h,
    marketCap: token.marketCap ?? token.fdv,
    liquidityUsd: token.liquidityUsd,
    buyFlowRatio: flow,
    rsi: ta?.rsi,
    macdSignal:
      ta?.macdSignal ??
      (ta?.score != null && ta.score >= 55 ? "bullish" : ta?.score != null && ta.score <= 45 ? "bearish" : "neutral"),
    top10HolderPct: token.intel?.top10HolderPercent,
  };
}

export function useConvictionGate(
  token: TrendingMarketToken | null,
  agent: AgentSignal | undefined,
) {
  const [data, setData] = useState<ConvictionPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqRef = useRef(0);

  useEffect(() => {
    if (!token?.symbol) {
      setData(null);
      return;
    }

    const id = ++reqRef.current;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void fetch("/api/nexus/conviction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: token.symbol,
          overlay: overlayFromToken(token),
          agent: agent
            ? {
                action: agent.action,
                confidence: agent.confidence,
                reasoning: agent.whyAction ?? agent.reasoning,
              }
            : undefined,
        }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error((await res.json()).error ?? "Gate failed");
          return res.json() as Promise<ConvictionPayload>;
        })
        .then((payload) => {
          if (reqRef.current === id) setData(payload);
        })
        .catch((e) => {
          if (reqRef.current === id) setError(e instanceof Error ? e.message : "Gate failed");
        })
        .finally(() => {
          if (reqRef.current === id) setLoading(false);
        });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [
    token?.symbol,
    token?.priceUsd,
    token?.change24h,
    token?.liquidityUsd,
    agent?.action,
    agent?.confidence,
    agent?.whyAction,
    agent?.reasoning,
  ]);

  return { data, loading, error };
}
