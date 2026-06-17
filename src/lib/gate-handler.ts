/**
 * MERIDIAN Gate — CMC-only evaluation for BNB Hack Track 2.
 * No synthetic backtest, no dex overlay, no fixture data.
 */
import {
  evaluateNexusGate,
  issueConstitutionPermit,
  toStructuredOutput,
} from "../../bnb-hack/engine/nexus-gate.mjs";
import { fetchGateSnapshot } from "../../bnb-hack/live/cmc-fetch.mjs";
import { runHistoricalBacktest } from "../../bnb-hack/live/run-backtest.mjs";
import { CONSTITUTION_SKILL } from "@/lib/constitution-skill-meta";
import { isGateSymbol } from "@/lib/gate-constants";
import type { AgentInput } from "@/lib/constitution-permit-handler";

const PUBLIC_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://trader-arc.vercel.app";

export async function buildGateEvaluateResponse(input: {
  symbol: string;
  agent?: AgentInput | null;
}) {
  const symbol = input.symbol.toUpperCase();
  if (!isGateSymbol(symbol)) {
    throw new Error(`Gate supports BNB and CAKE only — got ${symbol}`);
  }

  const { snapshot, sources, cmcLive } = await fetchGateSnapshot(symbol);
  const gate = evaluateNexusGate(snapshot);
  const structured = toStructuredOutput(snapshot, gate);
  const permit = issueConstitutionPermit(snapshot, input.agent ?? null);

  return {
    product: "MERIDIAN Gate",
    track: "BNB Hack · Strategy Skills (CoinMarketCap)",
    skill: CONSTITUTION_SKILL,
    symbol,
    cmcLive,
    dataIntegrity: "cmc-only-no-synthetic",
    fieldSources: sources,
    market: {
      price: snapshot.price,
      marketCap: snapshot.marketCap,
      volume24h: snapshot.volume24h,
      change1h: snapshot.change1h,
      change24h: snapshot.change24h,
      change7d: snapshot.change7d,
      fearGreed: snapshot.fearGreed,
      rsi: snapshot.rsi,
      macdSignal: snapshot.macdSignal,
    },
    gate: structured,
    permit: { ...permit, skill: CONSTITUTION_SKILL },
    backtest: {
      endpoint: `${PUBLIC_ORIGIN}/api/gate/backtest?symbol=${symbol}&days=90`,
      note: "Historical proof is served separately — never synthetic in this response",
    },
    reproduce: {
      evaluate: `curl "${PUBLIC_ORIGIN}/api/gate/evaluate?symbol=${symbol}"`,
      backtest: `curl "${PUBLIC_ORIGIN}/api/gate/backtest?symbol=${symbol}&days=90"`,
      cli: `npm run bnb:backtest -- --symbol ${symbol} --days 90`,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function buildGateBacktestResponse(input: { symbol: string; days?: number }) {
  const symbol = input.symbol.toUpperCase();
  if (!isGateSymbol(symbol)) {
    throw new Error(`Gate supports BNB and CAKE only — got ${symbol}`);
  }

  const days = input.days ?? 90;
  const result = await runHistoricalBacktest({ symbol, days, includeCompare: true });

  return {
    product: "MERIDIAN Gate",
    track: "BNB Hack · Strategy Skills (CoinMarketCap)",
    skill: CONSTITUTION_SKILL,
    symbol,
    days,
    ...result,
    reproduce: {
      api: `curl "${PUBLIC_ORIGIN}/api/gate/backtest?symbol=${symbol}&days=${days}"`,
      cli: `npm run bnb:backtest -- --symbol ${symbol} --days ${days}`,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function probeGateStatus() {
  const hasCmc = Boolean(process.env.CMC_API_KEY || process.env.CMC_PRO_API_KEY);
  let cmcLive = false;
  let fearGreed: number | null = null;
  let lastError: string | null = null;

  if (hasCmc) {
    try {
      const { snapshot } = await fetchGateSnapshot("BNB");
      cmcLive = true;
      fearGreed = snapshot.fearGreed ?? null;
    } catch (e) {
      lastError = e instanceof Error ? e.message : "CMC probe failed";
    }
  }

  return {
    product: "MERIDIAN Gate",
    track: CONSTITUTION_SKILL.hubTrack,
    skill: CONSTITUTION_SKILL,
    demo: `${PUBLIC_ORIGIN}/gate`,
    symbols: ["BNB", "CAKE"],
    dataPolicy: "All gate fields from CoinMarketCap — no synthetic backtest in live API",
    cmc: {
      configured: hasCmc,
      live: cmcLive,
      fearGreed,
      error: lastError,
    },
    endpoints: {
      evaluate: "/api/gate/evaluate",
      backtest: "/api/gate/backtest",
      status: "/api/gate/status",
      permit: "/api/constitution/permit",
    },
    generatedAt: new Date().toISOString(),
  };
}
