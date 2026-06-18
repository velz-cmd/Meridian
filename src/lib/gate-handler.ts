/**
 * MERIDIAN Gate — BSC Capital Router + permit APIs.
 */
import {
  evaluateNexusGate,
  issueConstitutionPermit,
  toStructuredOutput,
} from "../../bnb-hack/engine/nexus-gate.mjs";
import { composeSkillVerdict } from "../../bnb-hack/engine/meridian-skills.mjs";
import { fetchGateSnapshot, fetchGateSnapshotsBatch, fetchGlobalMacro } from "../../bnb-hack/live/cmc-fetch.mjs";
import { fetchKeyInfo } from "../../bnb-hack/live/cmc-fetch.mjs";
import { runHistoricalBacktest } from "../../bnb-hack/live/run-backtest.mjs";
import { convictionScore, routeBscCapital } from "../../bnb-hack/live/gate-router.mjs";
import { fetchBoracleUsdPrice, oracleCmcDeltaPct } from "@/lib/boracle-price";
import { isBoracleGateSymbol } from "@/lib/boracle-testnet-feeds";
import { CONSTITUTION_SKILL } from "@/lib/constitution-skill-meta";
import { GATE_SKILL_REPO, GATE_SYMBOLS, isGateSymbol } from "@/lib/gate-constants";
import { BSC_CHAIN_ID, BSC_CHAIN_LABEL } from "@/lib/bsc-chain";
import {
  buildGateExecutionUrl,
  GATE_PIPELINE_LAYERS,
  GATE_STACK_SUMMARY,
} from "@/lib/gate-nexus-bridge";
import type { AgentInput } from "@/lib/constitution-permit-handler";

const PUBLIC_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://trader-arc.vercel.app";

async function evaluateFromPack(
  symbol: string,
  pack: { snapshot: Record<string, unknown>; sources: Record<string, string | number | null>; cmcLive: boolean },
  agent: AgentInput | null,
  macro: Awaited<ReturnType<typeof fetchGlobalMacro>> | null,
  oracle: Awaited<ReturnType<typeof fetchBoracleUsdPrice>> | null,
) {
  const snapshot = pack.snapshot as Parameters<typeof evaluateNexusGate>[0];
  const gateRaw = evaluateNexusGate(snapshot);
  const gate = toStructuredOutput(snapshot, gateRaw);
  const skills = composeSkillVerdict(snapshot, gateRaw, macro ?? {});
  const permit = agent ? issueConstitutionPermit(snapshot, agent) : null;

  const stubPermit = {
    status: gate.signal === "ENTER_LONG" ? ("GRANT" as const) : ("DENY" as const),
    execute: gate.signal === "ENTER_LONG" ? ("LONG" as const) : ("FLAT" as const),
  };

  return {
    symbol,
    cmcLive: pack.cmcLive,
    fieldSources: {
      ...pack.sources,
      ...(oracle ? { oracleUsd: "boracle-bsc-testnet/feed-adapter" } : {}),
    },
    oracle: oracle
      ? {
          ...oracle,
          cmcPriceUsd: snapshot.price,
          cmcDeltaPct: oracleCmcDeltaPct(oracle.priceUsd, snapshot.price ?? 0),
        }
      : null,
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
    skills,
    permit: permit ? { ...permit, skill: CONSTITUTION_SKILL } : null,
    conviction: convictionScore(gate, permit ?? stubPermit, skills),
  };
}

async function evaluateSymbol(
  symbol: string,
  agent: AgentInput | null,
  macro: Awaited<ReturnType<typeof fetchGlobalMacro>> | null = null,
) {
  const { snapshot, sources, cmcLive } = await fetchGateSnapshot(symbol);
  const oracle = isBoracleGateSymbol(symbol) ? await fetchBoracleUsdPrice(symbol) : null;
  return evaluateFromPack(symbol, { snapshot, sources, cmcLive }, agent, macro, oracle);
}

function buildArbitration(
  symbol: string,
  agent: AgentInput,
  gate: Awaited<ReturnType<typeof evaluateSymbol>>["gate"],
  permit: NonNullable<Awaited<ReturnType<typeof evaluateSymbol>>["permit"]>,
) {
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
    executionUrl: `${PUBLIC_ORIGIN}${buildGateExecutionUrl({
      symbol,
      permit: permit.status,
      permitId: permit.permitId,
    })}`,
  };
}

export async function buildGateEvaluateResponse(input: {
  symbol: string;
  agent?: AgentInput | null;
}) {
  const symbol = input.symbol.toUpperCase();
  if (!isGateSymbol(symbol)) {
    throw new Error(`Gate supports ${GATE_SYMBOLS.join(", ")} only — got ${symbol}`);
  }

  const agent = input.agent ?? null;
  const macro = await fetchGlobalMacro();
  const eval_ = await evaluateSymbol(symbol, agent, macro);

  return {
    product: "MERIDIAN Momentum Constitution · CMC Strategy Skill",
    track: "BNB Hack · Strategy Skills (CoinMarketCap)",
    skill: CONSTITUTION_SKILL,
    dataIntegrity: "cmc-only-no-synthetic",
    macro,
    ...eval_,
    ...(agent && eval_.permit
      ? { arbitration: buildArbitration(symbol, agent, eval_.gate, eval_.permit) }
      : {}),
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
  const agent = input.agent ?? null;
  const macro = await fetchGlobalMacro();
  const batch = await fetchGateSnapshotsBatch([...GATE_SYMBOLS]);
  const oracles = await Promise.all(
    GATE_SYMBOLS.map(async (sym) => ({
      sym,
      oracle: isBoracleGateSymbol(sym) ? await fetchBoracleUsdPrice(sym) : null,
    })),
  );
  const oracleBySym = Object.fromEntries(oracles.map((o) => [o.sym, o.oracle]));

  const results = await Promise.all(
    GATE_SYMBOLS.map((sym) => {
      const pack = batch[sym];
      if (!pack) throw new Error(`No CMC batch quote for ${sym}`);
      return evaluateFromPack(
        sym,
        pack as { snapshot: Record<string, unknown>; sources: Record<string, string | number | null>; cmcLive: boolean },
        agent,
        macro,
        oracleBySym[sym] ?? null,
      );
    }),
  );
  const regime = results[0]?.gate.regime ?? "neutral";
  const fearGreed = results[0]?.market.fearGreed ?? 50;

  const route = routeBscCapital(
    results.map((r) => ({
      symbol: r.symbol,
      gate: r.gate,
      permit: r.permit ?? {
        status: r.gate.signal === "ENTER_LONG" ? "GRANT" : "DENY",
        execute: r.gate.signal === "ENTER_LONG" ? "LONG" : "FLAT",
      },
      market: r.market,
      skills: r.skills,
      conviction: r.conviction ?? convictionScore(r.gate, { status: r.gate.signal === "ENTER_LONG" ? "GRANT" : "DENY" }, r.skills),
    })),
    { agentAction: agent?.action, regime, fearGreed },
  );

  return {
    product: "MERIDIAN Momentum Constitution · CMC Strategy Skill",
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
    throw new Error(`Gate supports ${GATE_SYMBOLS.join(", ")} only — got ${symbol}`);
  }

  const days = input.days ?? 90;
  const result = await runHistoricalBacktest({ symbol, days, includeCompare: true });

  return {
    product: "MERIDIAN Momentum Constitution · CMC Strategy Skill",
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

  let historicalOk = false;
  if (hasCmc) {
    try {
      const { resolveSymbolId, fetchHistoricalDaily } = await import("../../bnb-hack/live/cmc-fetch.mjs");
      const id = await resolveSymbolId("BNB");
      const h = await fetchHistoricalDaily(id, 30);
      historicalOk = (h.data?.quotes?.length ?? 0) > 0;
    } catch {
      historicalOk = false;
    }
  }

  const keyInfo = hasCmc ? await fetchKeyInfo() : null;

  return {
    product: "MERIDIAN Gate · BSC Capital Router",
    track: CONSTITUTION_SKILL.hubTrack,
    skill: CONSTITUTION_SKILL,
    demo: `${PUBLIC_ORIGIN}/gate`,
    symbols: [...GATE_SYMBOLS],
    dataPolicy: "CMC-only live data · CMC historical when plan allows · else Binance venue replay",
    bnb: {
      chainId: BSC_CHAIN_ID,
      chain: BSC_CHAIN_LABEL,
      wallet: "Trust Wallet / MetaMask on BSC Testnet",
      faucet: "https://testnet.bnbchain.org/faucet-smart",
    },
    cmc: {
      configured: hasCmc,
      live: cmcLive,
      historical: historicalOk,
      fearGreed,
      error: lastError,
      plan: keyInfo
        ? {
            creditsPerMonth: keyInfo.creditLimitMonthly,
            creditsLeft: keyInfo.creditsLeftMonth,
            rateLimitPerMinute: keyInfo.rateLimitMinute,
            note:
              keyInfo.creditLimitMonthly && keyInfo.creditLimitMonthly <= 15000
                ? "REST tier still Basic (~15k credits) — historical blocked until CMC upgrades this key to Standard+"
                : "Paid tier detected — historical should work",
          }
        : null,
    },
    endpoints: {
      route: "/api/gate/route",
      evaluate: "/api/gate/evaluate",
      backtest: "/api/gate/backtest",
      status: "/api/gate/status",
      pipeline: "/api/gate/pipeline",
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function buildGatePipelineResponse() {
  const status = await probeGateStatus();
  const hasCmc = status.cmc.configured;
  const cmcLive = status.cmc.live;
  const historicalOk = status.cmc.historical;

  const layers = GATE_PIPELINE_LAYERS.map((layer) => {
    switch (layer.id) {
      case "skill":
      case "spec":
        return {
          ...layer,
          status: "ready" as const,
          detail: "LLM-authored rules in GitHub — importable to CMC Agent Hub",
        };
      case "backtest":
        return {
          ...layer,
          status: historicalOk ? ("ready" as const) : hasCmc ? ("degraded" as const) : ("blocked" as const),
          detail: historicalOk
            ? "90-day constitution vs naive agent on real daily bars"
            : hasCmc
              ? "CMC historical blocked on Basic tier — CLI uses Binance venue replay"
              : "Set CMC_API_KEY for live historical proof",
        };
      case "live":
        return {
          ...layer,
          status: cmcLive ? ("live" as const) : hasCmc ? ("degraded" as const) : ("blocked" as const),
          detail: cmcLive ? "CoinMarketCap quotes + fear/greed — no synthetic fixtures" : status.cmc.error ?? "CMC unavailable",
        };
      case "agent":
        return {
          ...layer,
          status: cmcLive ? ("ready" as const) : ("degraded" as const),
          detail: "Upstream BUY vs constitution GRANT/DENY with auditable permitId",
        };
      case "execution":
        return {
          ...layer,
          status: "ready" as const,
          detail: `${GATE_STACK_SUMMARY.settlement} · chain ${BSC_CHAIN_ID}`,
        };
      default:
        return { ...layer, status: "ready" as const, detail: "" };
    }
  });

  return {
    product: "MERIDIAN · Full Stack Strategy Skill",
    track: "BNB Hack · Strategy Skills (CoinMarketCap)",
    skill: CONSTITUTION_SKILL,
    stack: GATE_STACK_SUMMARY,
    layers,
    demoFlow: [
      "Open /gate — live CMC gate on BNB vs CAKE",
      "Permit arbitration — agent intent vs constitution",
      "90-day backtest — reproducible Quantopian-style proof",
      "GRANT → Execute on BSC Testnet — wallet-signed PancakeSwap swap",
    ],
    artifacts: {
      skill: `${GATE_SKILL_REPO}/SKILL.md`,
      strategySpec: `${GATE_SKILL_REPO}/STRATEGY_SPEC.md`,
      engine: `${GATE_SKILL_REPO.replace("/skills/nexus-momentum-gate", "")}/engine/nexus-gate.mjs`,
      outputSchema: `${GATE_SKILL_REPO}/OUTPUT_SCHEMA.json`,
    },
    urls: {
      product: `${PUBLIC_ORIGIN}/gate`,
      execution: `${PUBLIC_ORIGIN}/nexus`,
      status: `${PUBLIC_ORIGIN}/api/gate/status`,
      pipeline: `${PUBLIC_ORIGIN}/api/gate/pipeline`,
    },
    reproduce: {
      evaluate: `curl "${PUBLIC_ORIGIN}/api/gate/evaluate?symbol=BNB"`,
      backtest: `curl "${PUBLIC_ORIGIN}/api/gate/backtest?symbol=BNB&days=90"`,
      cli: "npm run bnb:backtest -- --symbol BNB --days 90",
    },
    cmc: status.cmc,
    bnb: status.bnb,
    generatedAt: new Date().toISOString(),
  };
}
