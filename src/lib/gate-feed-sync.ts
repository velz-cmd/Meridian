/**
 * Single source of truth: Gate engine → NEXUS feed + constitution desk.
 */
import { evaluateNexusGate, toStructuredOutput } from "../../bnb-hack/engine/nexus-gate.mjs";
import { composeSkillVerdict } from "../../bnb-hack/engine/meridian-skills.mjs";
import { fetchGateSnapshot, fetchGlobalMacro } from "../../bnb-hack/live/cmc-fetch.mjs";
import { isGateSymbol } from "@/lib/gate-constants";
import type { AgentSignal } from "@/lib/storage";
import type { TrendingToken } from "@/lib/dexscreener";

export function gateSignalToAgentAction(signal: string): "BUY" | "SELL" | "HOLD" {
  if (signal === "ENTER_LONG") return "BUY";
  if (signal === "EXIT" || signal === "AVOID") return "SELL";
  return "HOLD";
}

export async function evaluateGateForSymbol(symbol: string) {
  const sym = symbol.replace(/^\$/, "").trim().toUpperCase();
  const macro = await fetchGlobalMacro();
  const { snapshot, sources, cmcLive } = await fetchGateSnapshot(sym);
  const gateRaw = evaluateNexusGate(snapshot);
  const gate = toStructuredOutput(snapshot, gateRaw);
  const skills = composeSkillVerdict(snapshot, gateRaw, macro ?? {});
  const signal = skills.composite.signal;
  return { sym, snapshot, gate, gateRaw, skills, sources, cmcLive, macro, signal };
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
  return {
    action,
    confidence: gate.confidence ?? 55,
    riskScore: 40,
    reasoning: composite?.thesis ?? gate.thesis,
    whyAction: `${symbol}: ${gate.checksPassed}/${gate.checksTotal} checks · ${raw.replace("_", " ")}`,
    ...(action === "SELL" ? { deskVerdict: "EXIT" as const } : {}),
    reasoningFactors: [],
  };
}

export async function enrichTokensWithGateSignals<T extends TrendingToken>(tokens: T[]): Promise<T[]> {
  const benchSyms = new Set(
    tokens
      .map((t) => t.symbol.replace(/^\$/, "").trim().toUpperCase())
      .filter((s) => isGateSymbol(s)),
  );
  if (benchSyms.size === 0) return tokens;

  const evals = await Promise.all(
    [...benchSyms].map(async (sym) => {
      try {
        return await evaluateGateForSymbol(sym);
      } catch {
        return null;
      }
    }),
  );
  const bySym = new Map(evals.filter(Boolean).map((e) => [e!.sym, e!]));

  return tokens.map((t) => {
    const sym = t.symbol.replace(/^\$/, "").trim().toUpperCase();
    const ev = bySym.get(sym);
    if (!ev) return t;

    const agent = gateToAgentSignal(sym, ev.gate, ev.skills.composite);
    return {
      ...t,
      priceUsd: ev.snapshot.price ?? t.priceUsd,
      change24h: ev.snapshot.change24h ?? t.change24h,
      marketCap: ev.snapshot.marketCap ?? t.marketCap,
      volume24h: ev.snapshot.volume24h ?? t.volume24h,
      agent,
      discoveryTag: t.discoveryTag ?? "BSC benchmark · gate",
      sourceTags: [...new Set([...(t.sourceTags ?? []), "CMC Gate", "Strategy Skill"])],
      intel: {
        ...(t.intel ?? {}),
        gateSkills: ev.skills,
        gateFieldSources: ev.sources,
      },
    } as T;
  });
}
