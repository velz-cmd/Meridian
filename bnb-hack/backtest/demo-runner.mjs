/**
 * Shared demo runner — real CMC historical only when live=true.
 * No fixture fallback (use /api/gate/backtest for judges).
 */
import { runHistoricalBacktest } from "../live/run-backtest.mjs";
import { fetchGateSnapshot, cmcKey } from "../live/cmc-fetch.mjs";

/**
 * @param {{ live?: boolean; symbol?: string; days?: number }} opts
 */
export async function runBnbDemo(opts = {}) {
  const symbol = (opts.symbol ?? "BNB").toUpperCase();
  const days = opts.days ?? 90;
  const live = opts.live ?? false;

  if (!live || !cmcKey()) {
    return {
      ok: false,
      mode: "unavailable",
      error: "Set CMC_API_KEY and live=true — fixtures removed from demo runner",
      gate: "https://trader-arc.vercel.app/gate",
    };
  }

  const result = await runHistoricalBacktest({ symbol, days, includeCompare: true });
  if (!result.ok) return result;

  const { snapshot, sources } = await fetchGateSnapshot(symbol);

  return {
    ok: true,
    mode: result.mode,
    symbol,
    strategy: result.strategy,
    bars: result.bars,
    evalNow: result.evalNow,
    backtest: result.backtest,
    compare: result.compare,
    liveSnapshot: snapshot,
    fieldSources: sources,
    generatedAt: result.generatedAt,
  };
}
