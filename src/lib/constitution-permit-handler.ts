/**
 * Constitution Permit — shared handler for Track 2 runtime API + NEXUS desk.
 * Synthetic counterfactual removed — use /api/gate/backtest for real historical proof.
 */
import { issueConstitutionPermit } from "../../bnb-hack/engine/nexus-gate.mjs";
import { fetchLiveSnapshot, cmcCacheStats } from "../../bnb-hack/live/cmc-fetch.mjs";
import { fetchGateSnapshot } from "../../bnb-hack/live/cmc-fetch.mjs";
import { CONSTITUTION_SKILL } from "@/lib/constitution-skill-meta";
import { isGateSymbol } from "@/lib/gate-constants";
import { BSC_CHAIN_ID, BSC_CHAIN_LABEL } from "@/lib/bsc-chain";

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
  const deskPrice = overlay.priceUsd ?? 0;
  const deskLiq = overlay.liquidityUsd ?? 0;
  const cmcPrice = cmc?.price ?? 0;
  /** Dex microcaps: CMC symbol collision — desk wins only outside /gate benchmark path */
  const dexFirst =
    deskLiq > 0 &&
    deskLiq < 2_000_000 &&
    deskPrice > 0 &&
    cmcPrice > 0 &&
    Math.abs(cmcPrice - deskPrice) / deskPrice > 0.35;

  if (dexFirst || (!cmc && deskPrice > 0)) {
    return {
      symbol,
      price: deskPrice,
      marketCap: overlay.marketCap ?? 0,
      volume24h: overlay.volume24h ?? 0,
      change1h: overlay.change1h ?? 0,
      change24h: overlay.change24h ?? 0,
      change7d: overlay.change7d ?? 0,
      rsi: overlay.rsi ?? 50,
      macdSignal: overlay.macdSignal ?? "neutral",
      fearGreed: cmc?.fearGreed ?? 50,
      liquidityUsd: overlay.liquidityUsd,
      buyFlowRatio: overlay.buyFlowRatio,
      top10HolderPct: overlay.top10HolderPct,
    };
  }

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
  cmcOnly?: boolean;
}) {
  const symbol = input.symbol.toUpperCase();
  const overlay = input.overlay ?? {};
  const hasCmc = Boolean(process.env.CMC_API_KEY || process.env.CMC_PRO_API_KEY);
  const gateBenchmark = input.cmcOnly || (isGateSymbol(symbol) && !overlay.liquidityUsd);

  if (gateBenchmark && hasCmc) {
    const { snapshot, sources, cmcLive } = await fetchGateSnapshot(symbol);
    const permitCore = issueConstitutionPermit(snapshot, input.agent ?? null);
    const permit = { ...permitCore, skill: CONSTITUTION_SKILL };

    return {
      product: "MERIDIAN Gate",
      track: "BNB Hack · Strategy Skills (CoinMarketCap)",
      skill: CONSTITUTION_SKILL.id,
      skillMeta: CONSTITUTION_SKILL,
      dataSource: "cmc-only",
      dataIntegrity: "cmc-only-no-synthetic",
      fieldSources: sources,
      cmcLive,
      bnb: {
        chainId: BSC_CHAIN_ID,
        chain: BSC_CHAIN_LABEL,
        defaultSymbols: ["BNB", "CAKE"],
      },
      permit,
      backtest: {
        endpoint: `/api/gate/backtest?symbol=${symbol}&days=90`,
        note: "Real CMC historical backtest — no synthetic counterfactual in permit response",
      },
      api: {
        curl: `curl -X POST https://trader-arc.vercel.app/api/constitution/permit -H "Content-Type: application/json" -d '{"symbol":"${symbol}","agent":{"action":"BUY","confidence":85}}'`,
        gate: `https://trader-arc.vercel.app/api/gate/evaluate?symbol=${symbol}`,
        backtest: `https://trader-arc.vercel.app/api/gate/backtest?symbol=${symbol}&days=90`,
        status: "https://trader-arc.vercel.app/api/gate/status",
      },
      generatedAt: new Date().toISOString(),
    };
  }

  let cmcSnap: Awaited<ReturnType<typeof fetchLiveSnapshot>> | null = null;
  if (hasCmc) {
    try {
      cmcSnap = await fetchLiveSnapshot(symbol);
    } catch {
      cmcSnap = null;
    }
  }

  const snap = mergeSnapshot(cmcSnap, symbol, overlay);
  const deskDex =
    (overlay.liquidityUsd ?? 0) > 0 &&
    (overlay.liquidityUsd ?? 0) < 2_000_000 &&
    (overlay.priceUsd ?? 0) > 0 &&
    cmcSnap?.price &&
    Math.abs(cmcSnap.price - overlay.priceUsd!) / overlay.priceUsd! > 0.35;
  const permitCore = issueConstitutionPermit(snap, input.agent ?? null);
  const permit = { ...permitCore, skill: CONSTITUTION_SKILL };

  return {
    product: "MERIDIAN Constitution Permit",
    track: "BNB Hack · Strategy Skills (CoinMarketCap)",
    skill: CONSTITUTION_SKILL.id,
    skillMeta: CONSTITUTION_SKILL,
    dataSource: deskDex ? "desk-dex+cmc-macro" : cmcSnap ? "cmc-live+desk" : "desk+cmc-fallback",
    cmcLive: Boolean(cmcSnap) && !deskDex,
    bnb: {
      chainId: BSC_CHAIN_ID,
      chain: BSC_CHAIN_LABEL,
      wallet: "Trust Wallet / injected (MetaMask)",
      defaultSymbols: ["BNB", "CAKE"],
    },
    permit,
    backtest: {
      endpoint: `/api/gate/backtest?symbol=${isGateSymbol(symbol) ? symbol : "BNB"}&days=90`,
      note: "Use /gate for benchmark tokens — real historical backtest only",
    },
    api: {
      curl: `curl -X POST https://trader-arc.vercel.app/api/constitution/permit -H "Content-Type: application/json" -d '{"symbol":"${symbol}","agent":{"action":"BUY","confidence":85}}'`,
      gate: "https://trader-arc.vercel.app/gate",
      backtest: `https://trader-arc.vercel.app/api/gate/backtest?symbol=BNB&days=90`,
      status: "https://trader-arc.vercel.app/api/gate/status",
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function probeConstitutionStatus() {
  const hasCmc = Boolean(process.env.CMC_API_KEY || process.env.CMC_PRO_API_KEY);
  let cmcLive = false;
  let fearGreed: number | null = null;
  let lastError: string | null = null;

  if (hasCmc) {
    try {
      const snap = await fetchLiveSnapshot("BNB");
      cmcLive = true;
      fearGreed = snap.fearGreed ?? null;
    } catch (e) {
      lastError = e instanceof Error ? e.message : "CMC probe failed";
    }
  }

  return {
    product: "MERIDIAN Gate",
    track: CONSTITUTION_SKILL.hubTrack,
    skill: CONSTITUTION_SKILL,
    cmc: {
      configured: hasCmc,
      live: cmcLive,
      fearGreed,
      cache: cmcCacheStats(),
      error: lastError,
    },
    bnb: { chainId: BSC_CHAIN_ID, chain: BSC_CHAIN_LABEL, defaultSymbols: ["BNB", "CAKE"] },
    endpoints: {
      gate: "/gate",
      evaluate: "/api/gate/evaluate",
      backtest: "/api/gate/backtest",
      status: "/api/gate/status",
      permit: "/api/constitution/permit",
    },
    demo: {
      url: "https://trader-arc.vercel.app/gate",
      symbols: ["BNB", "CAKE"],
    },
    generatedAt: new Date().toISOString(),
  };
}
