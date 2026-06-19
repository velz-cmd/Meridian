/** Thin bridge — gate route row for market pulse without duplicate CMC calls */

import { GATE_SYMBOLS } from "./gate-constants";
import { evaluateAllGateBenchmarks } from "./gate-benchmark-cache";
import { convictionScore } from "../../bnb-hack/live/gate-router.mjs";

export async function fetchGateRoutePayload(symbol: string) {
  const sym = symbol.toUpperCase();
  if (!(GATE_SYMBOLS as readonly string[]).includes(sym)) return null;

  const batch = await evaluateAllGateBenchmarks();
  const ev = batch.bySym.get(sym);
  if (!ev) return null;

  const snapshot = ev.snapshot as {
    price?: number;
    change24h?: number;
    fearGreed?: number;
    rsi?: number;
    macdSignal?: string;
    marketCap?: number;
    volume24h?: number;
  };
  const cleared = ev.skills.composite.cleared;
  const stubPermit = {
    status: cleared ? ("GRANT" as const) : ("DENY" as const),
    execute: cleared ? ("LONG" as const) : ("FLAT" as const),
  };

  return {
    symbol: sym,
    cmcLive: ev.cmcLive,
    gate: ev.gate,
    market: {
      price: snapshot.price ?? 0,
      change24h: snapshot.change24h ?? 0,
      fearGreed: snapshot.fearGreed,
      rsi: snapshot.rsi,
      macdSignal: snapshot.macdSignal,
      marketCap: snapshot.marketCap,
      volume24h: snapshot.volume24h,
    },
    skills: ev.skills,
    conviction: convictionScore(ev.gate, stubPermit, ev.skills),
  };
}
