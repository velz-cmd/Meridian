/**
 * Single source of truth: Gate engine → NEXUS feed + constitution desk.
 */
import { isGateSymbol } from "@/lib/gate-constants";
import type { AgentSignal } from "@/lib/storage";
import type { TrendingToken } from "@/lib/dexscreener";
import {
  evaluateAllGateBenchmarks,
  type GateBenchmarkEval,
} from "@/lib/gate-benchmark-cache";

export function gateSignalToAgentAction(signal: string): "BUY" | "SELL" | "HOLD" {
  if (signal === "ENTER_LONG") return "BUY";
  if (signal === "EXIT" || signal === "AVOID") return "SELL";
  return "HOLD";
}

export async function evaluateGateForSymbol(symbol: string): Promise<GateBenchmarkEval | null> {
  const sym = symbol.replace(/^\$/, "").trim().toUpperCase();
  if (!isGateSymbol(sym)) return null;
  const { bySym } = await evaluateAllGateBenchmarks();
  return bySym.get(sym) ?? null;
}

export function gateToAgentSignal(
  symbol: string,
  gate: {
    signal: string;
    confidence?: number;
    thesis: string;
    checksPassed: number;
    checksTotal: number;
  },
  composite?: { signal: string; thesis: string; alignmentScore?: number },
): AgentSignal {
  const raw = composite?.signal ?? gate.signal;
  const action = gateSignalToAgentAction(raw);
  const alignment = composite?.alignmentScore;
  const confBase = gate.confidence ?? 55;
  const confidence =
    alignment != null
      ? Math.round(Math.min(92, Math.max(38, confBase * 0.55 + alignment * 0.45)))
      : confBase;

  return {
    action,
    confidence,
    riskScore: raw === "ENTER_LONG" ? 35 : raw === "AVOID" ? 72 : 48,
    reasoning: composite?.thesis ?? gate.thesis,
    whyAction: `${symbol}: ${gate.checksPassed}/${gate.checksTotal} checks · ${raw.replace(/_/g, " ")}`,
    ...(action === "SELL" ? { deskVerdict: "EXIT" as const } : {}),
    reasoningFactors: [],
  };
}

/** Gate-only feed row — no Dex security / hunter heuristics. */
export function gateBenchmarkToFeedAnalysis<T extends TrendingToken>(
  token: T,
  ev: GateBenchmarkEval,
): {
  token: T;
  intel: Record<string, unknown>;
  signal: AgentSignal;
  security: null;
} {
  const agent = gateToAgentSignal(ev.sym, ev.gate, ev.skills.composite);
  const intel = {
    gateSkills: ev.skills,
    gateFieldSources: ev.sources,
    technical: {
      rsi: ev.snapshot.rsi as number | undefined,
      macdSignal: ev.snapshot.macdSignal as string | undefined,
    },
  };
  const enriched = {
    ...token,
    priceUsd: (ev.snapshot.price as number | undefined) ?? token.priceUsd,
    change24h: (ev.snapshot.change24h as number | undefined) ?? token.change24h,
    marketCap: (ev.snapshot.marketCap as number | undefined) ?? token.marketCap,
    volume24h: (ev.snapshot.volume24h as number | undefined) ?? token.volume24h,
    agent,
    discoveryTag: "BSC benchmark · CMC gate",
    sourceTags: [...new Set([...(token.sourceTags ?? []), "CMC Gate", "Strategy Skill"])],
    intel,
  } as T;

  return { token: enriched, intel, signal: agent, security: null };
}

export async function enrichTokensWithGateSignals<T extends TrendingToken>(tokens: T[]): Promise<T[]> {
  const hasBench = tokens.some((t) => isGateSymbol(t.symbol.replace(/^\$/, "").trim().toUpperCase()));
  if (!hasBench) return tokens;

  let batch: Awaited<ReturnType<typeof evaluateAllGateBenchmarks>>;
  try {
    batch = await evaluateAllGateBenchmarks();
  } catch {
    return tokens;
  }

  return tokens.map((t) => {
    const sym = t.symbol.replace(/^\$/, "").trim().toUpperCase();
    if (!isGateSymbol(sym)) return t;
    const ev = batch.bySym.get(sym);
    if (!ev) return t;
    return gateBenchmarkToFeedAnalysis(t, ev).token;
  });
}

export function splitFeedByGateBenchmarks<T extends TrendingToken>(tokens: T[]): {
  benchmarks: T[];
  discovery: T[];
} {
  const benchmarks: T[] = [];
  const discovery: T[] = [];
  for (const t of tokens) {
    const sym = t.symbol.replace(/^\$/, "").trim().toUpperCase();
    if (isGateSymbol(sym)) benchmarks.push(t);
    else discovery.push(t);
  }
  return { benchmarks, discovery };
}
