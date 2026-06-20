/**
 * BNB Hack — live traction aggregator for public analytics dashboard.
 */
import { evaluateAllGateBenchmarks } from "@/lib/gate-benchmark-cache";
import { GATE_SYMBOLS } from "@/lib/gate-constants";
import { effectivePosition } from "@/lib/gate-effective-signal";
import { probeGateStatus } from "@/lib/gate-handler";
import { fetchBnbOnChainStats } from "@/lib/bnb-onchain-stats";
import {
  fetchDuneBnbAnalytics,
  getDunePublicConfig,
  hasDuneKey,
  probeDune,
} from "@/lib/dune-client";
import { getGlobalDemoTradeStats } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";
import { getProductAnalyticsStats } from "@/lib/product-analytics";
import type { BnbAnalyticsPayload } from "@/lib/bnb-analytics-types";

export type { BnbAnalyticsPayload } from "@/lib/bnb-analytics-types";

const PUBLIC_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://trader-arc.vercel.app";

async function countSupabaseTable(table: "nexus_decisions" | "prism_predictions"): Promise<number | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

export async function buildBnbAnalyticsPayload(): Promise<BnbAnalyticsPayload> {
  const duneConfig = getDunePublicConfig();

  const [gateBatch, gateStatus, onChain, execution, duneProbe, duneData, nexusCount, prismCount, productStats] =
    await Promise.all([
      evaluateAllGateBenchmarks().catch(() => null),
      probeGateStatus(),
      fetchBnbOnChainStats(),
      getGlobalDemoTradeStats(),
      probeDune(),
      hasDuneKey() ? fetchDuneBnbAnalytics() : Promise.resolve({ stats: null, txs: null, metrics: {} }),
      countSupabaseTable("nexus_decisions"),
      countSupabaseTable("prism_predictions"),
      getProductAnalyticsStats(),
    ]);

  let permitsClear = 0;
  let regime = "neutral";
  let fearGreed = 50;
  let primary = "FLAT";
  let degraded = false;

  if (gateBatch?.bySym.size) {
    for (const sym of GATE_SYMBOLS) {
      const ev = gateBatch.bySym.get(sym);
      if (!ev) continue;
      if (effectivePosition(ev.gate, ev.skills as never) === "LONG") permitsClear += 1;
    }
    const first = gateBatch.bySym.get(GATE_SYMBOLS[0]!);
    regime = first?.gate.regime ?? "neutral";
    fearGreed = Number((first?.snapshot as { fearGreed?: number })?.fearGreed ?? 50);
    degraded = Boolean(gateBatch.degraded);
  }

  if (gateBatch?.bySym.size) {
    const ranked = GATE_SYMBOLS.map((sym) => gateBatch.bySym.get(sym)).filter(Boolean);
    const top = ranked.sort(
      (a, b) => (b!.skills.composite?.alignmentScore ?? 0) - (a!.skills.composite?.alignmentScore ?? 0),
    )[0];
    if (top && effectivePosition(top.gate, top.skills as never) === "LONG") {
      primary = top.sym;
    }
  }

  return {
    brand: "MERIDIAN",
    track: "Strategy Skills (CoinMarketCap) + BSC Testnet execution",
    generatedAt: new Date().toISOString(),
    live: {
      app: PUBLIC_ORIGIN,
      gate: `${PUBLIC_ORIGIN}/gate`,
      nexus: `${PUBLIC_ORIGIN}/nexus`,
      analytics: `${PUBLIC_ORIGIN}/analytics`,
    },
    dune: {
      configured: duneProbe.configured,
      dashboardUrl: duneConfig.dashboardUrl,
      embedUrl: duneConfig.embedUrl,
      queryIds: duneConfig.queryIds,
      metrics: duneData.metrics,
      recentTxRows: duneData.txs?.rows ?? duneData.stats?.rows.slice(0, 8) ?? [],
      error: duneProbe.error,
    },
    gate: {
      cmcLive: gateStatus.cmc.live,
      degraded,
      benchmarks: gateBatch?.bySym.size ?? GATE_SYMBOLS.length,
      permitsClear,
      regime,
      fearGreed,
      primary,
      symbols: [...GATE_SYMBOLS],
    },
    execution,
    onChain,
    product: productStats,
    platform: {
      supabaseConfigured: Boolean(getSupabase()),
      nexusDecisions: nexusCount,
      prismPredictions: prismCount,
    },
    api: {
      evaluate: `${PUBLIC_ORIGIN}/api/gate/evaluate?symbol=BNB`,
      backtest: `${PUBLIC_ORIGIN}/api/gate/backtest?symbol=BNB&days=90`,
      route: `${PUBLIC_ORIGIN}/api/gate/route`,
      status: `${PUBLIC_ORIGIN}/api/gate/status`,
      analytics: `${PUBLIC_ORIGIN}/api/bnb/analytics`,
    },
  };
}
