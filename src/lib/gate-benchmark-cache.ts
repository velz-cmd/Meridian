/**
 * Single batched CMC evaluation for all gate benchmarks — shared by feed, permit, /gate route.
 * One quotes call + shared F&G per cycle; stale cache on 429.
 */
import { evaluateNexusGate, toStructuredOutput } from "../../bnb-hack/engine/nexus-gate.mjs";
import { composeSkillVerdict } from "../../bnb-hack/engine/meridian-skills.mjs";
import { fetchGateSnapshotsBatch, fetchGlobalMacro } from "../../bnb-hack/live/cmc-fetch.mjs";
import { GATE_SYMBOLS } from "@/lib/gate-constants";

const TTL_MS = 90_000;

export type GateBenchmarkEval = {
  sym: string;
  snapshot: Record<string, unknown>;
  gate: ReturnType<typeof toStructuredOutput>;
  gateRaw: ReturnType<typeof evaluateNexusGate>;
  skills: ReturnType<typeof composeSkillVerdict>;
  sources: Record<string, string | number | null>;
  cmcLive: boolean;
};

type CacheRow = {
  at: number;
  evals: Map<string, GateBenchmarkEval>;
  macro: Awaited<ReturnType<typeof fetchGlobalMacro>> | null;
};

let cached: CacheRow | null = null;
let inflight: Promise<GateBenchmarkBatchResult> | null = null;

export type GateBenchmarkBatchResult = {
  bySym: Map<string, GateBenchmarkEval>;
  macro: Awaited<ReturnType<typeof fetchGlobalMacro>> | null;
  fromCache: boolean;
  degraded?: boolean;
  error?: string;
};

function evaluatePack(
  sym: string,
  pack: { snapshot: Record<string, unknown>; sources: Record<string, string | number | null>; cmcLive: boolean },
  macro: Awaited<ReturnType<typeof fetchGlobalMacro>> | null,
): GateBenchmarkEval {
  const snapshot = pack.snapshot as Parameters<typeof evaluateNexusGate>[0];
  const gateRaw = evaluateNexusGate(snapshot);
  const gate = toStructuredOutput(snapshot, gateRaw);
  const skills = composeSkillVerdict(snapshot, gateRaw, macro ?? {});
  return { sym, snapshot: pack.snapshot, gate, gateRaw, skills, sources: pack.sources, cmcLive: pack.cmcLive };
}

export async function evaluateAllGateBenchmarks(force = false): Promise<GateBenchmarkBatchResult> {
  if (!force && cached && Date.now() - cached.at < TTL_MS) {
    return { bySym: cached.evals, macro: cached.macro, fromCache: true };
  }
  if (inflight && !force) return inflight;

  inflight = (async () => {
    try {
      const [macro, batch] = await Promise.all([
        fetchGlobalMacro(),
        fetchGateSnapshotsBatch([...GATE_SYMBOLS]),
      ]);
      const evals = new Map<string, GateBenchmarkEval>();
      for (const sym of GATE_SYMBOLS) {
        const pack = batch[sym];
        if (pack) {
          evals.set(
            sym,
            evaluatePack(
              sym,
              pack as {
                snapshot: Record<string, unknown>;
                sources: Record<string, string | number | null>;
                cmcLive: boolean;
              },
              macro,
            ),
          );
        }
      }
      if (evals.size === 0) throw new Error("CMC batch returned no gate benchmark quotes");
      cached = { at: Date.now(), evals, macro };
      return { bySym: evals, macro, fromCache: false };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (cached && cached.evals.size > 0) {
        return { bySym: cached.evals, macro: cached.macro, fromCache: true, degraded: true, error: msg };
      }
      throw e;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function getCachedGateBenchmark(sym: string): GateBenchmarkEval | null {
  return cached?.evals.get(sym.toUpperCase()) ?? null;
}
