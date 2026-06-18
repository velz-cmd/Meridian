/** Thin bridge — gate route row for market pulse without circular imports */

import { GATE_SYMBOLS } from "./gate-constants";

export async function fetchGateRoutePayload(symbol: string) {
  const sym = symbol.toUpperCase();
  if (!(GATE_SYMBOLS as readonly string[]).includes(sym)) return null;

  const { buildGateRouteResponse } = await import("./gate-handler");
  const res = await buildGateRouteResponse({});
  const bench = res.benchmarks?.find((b) => b.symbol === sym);
  return bench ?? null;
}
