import { NextRequest, NextResponse } from "next/server";
import { enforceAgentGate, toStructuredOutput, evaluateNexusGate } from "../../../../../bnb-hack/engine/nexus-gate.mjs";
import { fetchLiveSnapshot } from "../../../../../bnb-hack/live/cmc-fetch.mjs";
import { runBnbDemo } from "../../../../../bnb-hack/backtest/demo-runner.mjs";

export const runtime = "nodejs";

type AgentInput = { action: "BUY" | "SELL" | "HOLD"; confidence?: number; reasoning?: string };

type DeskOverlay = {
  priceUsd?: number;
  change24h?: number;
  change1h?: number;
  change7d?: number;
  volume24h?: number;
  marketCap?: number;
  liquidityUsd?: number;
  buyFlowRatio?: number;
  rsi?: number;
  macdSignal?: string;
  top10HolderPct?: number;
};

function mergeSnapshot(
  cmc: Awaited<ReturnType<typeof fetchLiveSnapshot>> | null,
  symbol: string,
  overlay: DeskOverlay,
) {
  const buys = overlay.buyFlowRatio != null ? overlay.buyFlowRatio : undefined;
  return {
    symbol,
    price: cmc?.price ?? overlay.priceUsd ?? 0,
    marketCap: cmc?.marketCap ?? overlay.marketCap ?? 0,
    volume24h: cmc?.volume24h ?? overlay.volume24h ?? 0,
    change1h: cmc?.change1h ?? overlay.change1h ?? 0,
    change24h: cmc?.change24h ?? overlay.change24h ?? 0,
    change7d: cmc?.change7d ?? overlay.change7d ?? 0,
    rsi: overlay.rsi ?? cmc?.rsi ?? 50,
    macdSignal: overlay.macdSignal ?? cmc?.macdSignal ?? "neutral",
    fearGreed: cmc?.fearGreed ?? 50,
    liquidityUsd: overlay.liquidityUsd,
    buyFlowRatio: buys,
    top10HolderPct: overlay.top10HolderPct,
  };
}

function deskOverlayFromBody(body: Record<string, unknown>): DeskOverlay {
  const o = (body.overlay ?? body) as DeskOverlay;
  return {
    priceUsd: num(o.priceUsd),
    change24h: num(o.change24h),
    change1h: num(o.change1h),
    change7d: num(o.change7d),
    volume24h: num(o.volume24h),
    marketCap: num(o.marketCap),
    liquidityUsd: num(o.liquidityUsd),
    buyFlowRatio: num(o.buyFlowRatio),
    rsi: num(o.rsi),
    macdSignal: typeof o.macdSignal === "string" ? o.macdSignal : undefined,
    top10HolderPct: num(o.top10HolderPct),
  };
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const symbol = String(body.symbol ?? "BNB").toUpperCase();
    const agent = body.agent as AgentInput | undefined;
    const overlay = deskOverlayFromBody(body);
    const hasCmc = Boolean(process.env.CMC_API_KEY || process.env.CMC_PRO_API_KEY);

    let cmcSnap: Awaited<ReturnType<typeof fetchLiveSnapshot>> | null = null;
    if (hasCmc) {
      try {
        cmcSnap = await fetchLiveSnapshot(symbol);
      } catch {
        cmcSnap = null;
      }
    }

    const snap = mergeSnapshot(cmcSnap, symbol, overlay);
    const gate = evaluateNexusGate(snap);
    const structured = toStructuredOutput(snap, gate);

    let veto = null;
    if (agent?.action) {
      veto = enforceAgentGate(snap, {
        action: agent.action as "BUY" | "HOLD" | "EXIT" | "AVOID" | "ENTER_LONG",
        confidence: agent.confidence,
        reasoning: agent.reasoning,
      });
    }

    let backtest = null;
    if (hasCmc) {
      try {
        const bt = await runBnbDemo({ live: true, symbol, days: 90 });
        backtest = bt.backtest;
      } catch {
        /* optional */
      }
    }

    return NextResponse.json({
      schema: "nexus-conviction/v1",
      symbol,
      dataSource: cmcSnap ? "cmc+desk" : "desk-only",
      cmcLive: Boolean(cmcSnap),
      gate: structured,
      veto,
      backtest,
      skill: "nexus-momentum-gate",
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Conviction gate failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
