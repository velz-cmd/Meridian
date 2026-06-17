/**
 * MERIDIAN Gate — BSC Capital Router + permit APIs.
 */
import {
  evaluateNexusGate,
  issueConstitutionPermit,
  toStructuredOutput,
} from "../../bnb-hack/engine/nexus-gate.mjs";
import { fetchGateSnapshot } from "../../bnb-hack/live/cmc-fetch.mjs";
import { runHistoricalBacktest } from "../../bnb-hack/live/run-backtest.mjs";
import { convictionScore, routeBscCapital } from "../../bnb-hack/live/gate-router.mjs";
import { CONSTITUTION_SKILL } from "@/lib/constitution-skill-meta";
import { GATE_SYMBOLS, isGateSymbol } from "@/lib/gate-constants";
import type { AgentInput } from "@/lib/constitution-permit-handler";

const PUBLIC_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://trader-arc.vercel.app";

const DEFAULT_AGENT: AgentInput = {
  action: "BUY",
  confidence: 92,
  reasoning: "Upstream agent proposes tactical long on BSC benchmark.",
};

async function evaluateSymbol(symbol: string, agent: AgentInput) {
  const { snapshot, sources, cmcLive } = await fetchGateSnapshot(symbol);
  const gateRaw = evaluateNexusGate(snapshot);
  const gate = toStructuredOutput(snapshot, gateRaw);
  const permit = issueConstitutionPermit(snapshot, agent);

  return {
    symbol,
    cmcLive,
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
    gate,
    permit: { ...permit, skill: CONSTITUTION_SKILL },
    conviction: convictionScore(gate, permit),
  };
}

function buildArbitration(agent: AgentInput, gate: Awaited<ReturnType<typeof evaluateSymbol>>["gate"], permit: Awaited<ReturnType<typeof evaluateSymbol>>["permit"]) {
  const agentConf = agent.confidence ?? 70;
  const gateConf = gate.confidence ?? 50;
  const gap = agentConf - gateConf;
  const vetoed = permit.overridden ?? false;

  let narrative: string;
  if (permit.status === "DENY" && agent.action === "BUY") {
    narrative = vetoed
      ? `Agent confidence (${agentConf}%) exceeds gate calibration (${gateConf}%) — constitution vetoed the entry.`
      : `Gate signal is ${gate.signal.replace("_", " ")} — agent BUY not cleared for sizing.`;
  } else if (permit.status === "GRANT") {
    narrative = `Agent BUY aligns with ${gate.tier.toUpperCase()} ${gate.signal.replace("_", " ")} under ${gate.regime ?? "neutral"} regime.`;
  } else {
    narrative = gate.thesis;
  }

  return {
    agent: { action: agent.action, confidence: agentConf, reasoning: agent.reasoning },
    gate: { confidence: gateConf, edge: gate.edge, signal: gate.signal, regime: gate.regime },
    gap,
    vetoed,
    verdict: permit.status,
    execute: permit.execute,
    permitId: permit.permitId,
    narrative,
    nexusUrl: `${PUBLIC_ORIGIN}/nexus`,
  };
}

export async function buildGateEvaluateResponse(input: {
  symbol: string;
  agent?: AgentInput | null;
}) {
  const symbol = input.symbol.toUpperCase();
  if (!isGateSymbol(symbol)) {
    throw new Error(`Gate supports BNB and CAKE only — got ${symbol}`);
  }

  const agent = input.agent ?? DEFAULT_AGENT;
  const eval_ = await evaluateSymbol(symbol, agent);

  return {
    product: "MERIDIAN Gate · BSC Capital Router",
    track: "BNB Hack · Strategy Skills (CoinMarketCap)",
    skill: CONSTITUTION_SKILL,
    dataIntegrity: "cmc-only-no-synthetic",
    ...eval_,
    arbitration: buildArbitration(agent, eval_.gate, eval_.permit),
    reproduce: {
      evaluate: `curl "${PUBLIC_ORIGIN}/api/gate/evaluate?symbol=${symbol}"`,
      route: `curl "${PUBLIC_ORIGIN}/api/gate/route"`,
      backtest: `curl "${PUBLIC_ORIGIN}/api/gate/backtest?symbol=${symbol}&days=90"`,
      cli: `npm run bnb:backtest -- --symbol ${symbol} --days 90`,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function buildGateRouteResponse(input: { agent?: AgentInput | null } = {}) {
  const agent = input.agent ?? DEFAULT_AGENT;
  const results = await Promise.all(GATE_SYMBOLS.map((sym) => evaluateSymbol(sym, agent)));
  const regime = results[0]?.gate.regime ?? "neutral";
  const fearGreed = results[0]?.market.fearGreed ?? 50;

  const route = routeBscCapital(
    results.map((r) => ({
      symbol: r.symbol,
      gate: r.gate,
      permit: r.permit,
      market: r.market,
      conviction: r.conviction,
    })),
    { agentAction: agent.action, regime, fearGreed },
  );

  return {
    product: "MERIDIAN Gate · BSC Capital Router",
    track: "BNB Hack · Strategy Skills (CoinMarketCap)",
    skill: CONSTITUTION_SKILL,
    dataIntegrity: "cmc-only-no-synthetic",
    benchmarks: results,
    route,
    reproduce: {
      route: `curl "${PUBLIC_ORIGIN}/api/gate/route"`,
      evaluate: `curl "${PUBLIC_ORIGIN}/api/gate/evaluate?symbol=BNB"`,
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
    product: "MERIDIAN Gate · BSC Capital Router",
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
    product: "MERIDIAN Gate · BSC Capital Router",
    track: CONSTITUTION_SKILL.hubTrack,
    skill: CONSTITUTION_SKILL,
    demo: `${PUBLIC_ORIGIN}/gate`,
    symbols: [...GATE_SYMBOLS],
    dataPolicy: "CMC-only live data · real historical backtest · BSC benchmark capital routing",
    cmc: {
      configured: hasCmc,
      live: cmcLive,
      fearGreed,
      error: lastError,
    },
    endpoints: {
      route: "/api/gate/route",
      evaluate: "/api/gate/evaluate",
      backtest: "/api/gate/backtest",
      status: "/api/gate/status",
    },
    generatedAt: new Date().toISOString(),
  };
}
