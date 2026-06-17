"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentSignal } from "@/lib/storage";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import type { ConstitutionSkillMeta } from "@/lib/constitution-skill-meta";
import { appendPermitLog } from "@/lib/constitution-permit-log";

export type ConstitutionPermitPayload = {
  product: string;
  track?: string;
  skill?: string;
  skillMeta?: ConstitutionSkillMeta;
  permit: {
    schema: string;
    permitId: string;
    status: "GRANT" | "DENY";
    execute: string;
    agentRequested: string | null;
    constitutionSignal: string;
    finalAction: string;
    overridden: boolean;
    tier: string;
    confidence: number;
    risk: number;
    thesis: string;
    skill?: ConstitutionSkillMeta;
    gate: {
      signal: string;
      regime?: string;
      checks: { id: string; pass: boolean; weight: number; label: string }[];
      checksPassed: number;
      checksTotal: number;
      agreement: number;
      agentDirective: string;
    };
  };
  counterfactual: {
    constitution: { totalReturnPct: number; maxDrawdownPct: number; winRatePct: number };
    naiveAgent: { totalReturnPct: number; maxDrawdownPct: number; winRatePct: number };
    edge: { returnDeltaPct: number; drawdownSavedPct: number; winRateDeltaPct: number };
  };
  counterfactualMeta?: {
    mode: string;
    bars: number;
    anchorSymbol?: string;
    anchorPrice?: number | null;
    regime?: string | null;
    fearGreed?: number;
    note?: string;
  };
  cmcLive: boolean;
  dataSource: string;
  generatedAt?: string;
  api?: { curl?: string; status?: string; permit?: string };
};

function overlayFromToken(token: TrendingMarketToken) {
  const pc = token.priceChange;
  const buys = token.txns24h?.buys ?? token.intel?.buy24h ?? 0;
  const sells = token.txns24h?.sells ?? token.intel?.sell24h ?? 1;
  const ta = token.intel?.technical;
  return {
    priceUsd: token.priceUsd,
    change24h: token.change24h,
    change1h: pc?.h1,
    change7d: pc?.h6,
    volume24h: token.volume24h,
    marketCap: token.marketCap ?? token.fdv,
    liquidityUsd: token.liquidityUsd,
    buyFlowRatio: buys + sells > 0 ? buys / (buys + sells) : undefined,
    rsi: ta?.rsi,
    macdSignal:
      ta?.macdSignal ??
      (ta?.score != null && ta.score >= 55 ? "bullish" : ta?.score != null && ta.score <= 45 ? "bearish" : "neutral"),
    top10HolderPct: token.intel?.top10HolderPercent,
  };
}

export function useConstitutionPermit(
  token: TrendingMarketToken | null,
  agent: AgentSignal | undefined,
) {
  const [payload, setPayload] = useState<ConstitutionPermitPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqRef = useRef(0);

  useEffect(() => {
    if (!token?.symbol) {
      setPayload(null);
      return;
    }

    const id = ++reqRef.current;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void fetch("/api/constitution/permit", {
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
            : { action: "BUY" as const, confidence: 70, reasoning: "Desk default probe" },
        }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error((await res.json()).error ?? "Permit failed");
          return res.json() as Promise<ConstitutionPermitPayload>;
        })
        .then((p) => {
          if (reqRef.current === id) {
            setPayload(p);
            if (p.permit) {
              appendPermitLog({
                permitId: p.permit.permitId,
                symbol: token.symbol,
                status: p.permit.status,
                agentAction: p.permit.agentRequested,
                regime: p.permit.gate?.regime,
                cmcLive: p.cmcLive,
                at: p.generatedAt ?? new Date().toISOString(),
              });
            }
          }
        })
        .catch((e) => {
          if (reqRef.current === id) setError(e instanceof Error ? e.message : "Permit failed");
        })
        .finally(() => {
          if (reqRef.current === id) setLoading(false);
        });
    }, 350);

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

  const permit = payload?.permit;
  const agentWantsBuy = agent?.action === "BUY" || permit?.agentRequested === "BUY";
  const canExecuteBuy =
    !agentWantsBuy || (permit?.status === "GRANT" && permit.finalAction === "ENTER_LONG");

  return { payload, loading, error, canExecuteBuy };
}
