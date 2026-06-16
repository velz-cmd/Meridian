/**
 * Constitution Permit — shared handler for Track 2 runtime API + NEXUS desk.
 */
import {
  issueConstitutionPermit,
  backtestCompare,
} from "../../bnb-hack/engine/nexus-gate.mjs";
import { fetchLiveSnapshot } from "../../bnb-hack/live/cmc-fetch.mjs";
import { fixtureSeries } from "../../bnb-hack/backtest/fixture-series.mjs";

export type AgentInput = { action: "BUY" | "SELL" | "HOLD"; confidence?: number; reasoning?: string };

export type DeskOverlay = {
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

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export function deskOverlayFromBody(body: Record<string, unknown>): DeskOverlay {
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

export function mergeSnapshot(
  cmc: Awaited<ReturnType<typeof fetchLiveSnapshot>> | null,
  symbol: string,
  overlay: DeskOverlay,
) {
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
    buyFlowRatio: overlay.buyFlowRatio,
    top10HolderPct: overlay.top10HolderPct,
  };
}

export async function buildConstitutionResponse(input: {
  symbol: string;
  agent?: AgentInput | null;
  overlay?: DeskOverlay;
}) {
  const symbol = input.symbol.toUpperCase();
  const overlay = input.overlay ?? {};
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
  const permit = issueConstitutionPermit(snap, input.agent ?? null);
  const counterfactual = backtestCompare(fixtureSeries);

  return {
    product: "MERIDIAN Constitution Permit",
    track: "BNB Hack · Strategy Skills (CoinMarketCap)",
    skill: "nexus-momentum-gate",
    dataSource: cmcSnap ? "cmc-live+desk" : "desk+cmc-fallback",
    cmcLive: Boolean(cmcSnap),
    permit,
    counterfactual,
    api: {
      curl: `curl -X POST https://trader-arc.vercel.app/api/constitution/permit -H "Content-Type: application/json" -d '{"symbol":"${symbol}","agent":{"action":"BUY","confidence":85}}'`,
    },
    generatedAt: new Date().toISOString(),
  };
}
