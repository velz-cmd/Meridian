#!/usr/bin/env node
/** Smoke test for nexus-gate engine + CLI paths */
import { evaluateNexusGate, backtestSeries, enforceAgentGate, toStructuredOutput } from "../engine/nexus-gate.mjs";
import { fixtureSeries } from "./fixture-series.mjs";

const snap = fixtureSeries[fixtureSeries.length - 1];
const ev = evaluateNexusGate(snap);
const structured = toStructuredOutput(snap, ev);
const bt = backtestSeries(fixtureSeries);
const vetoSnap = {
  symbol: "TEST",
  price: 1,
  marketCap: 1e6,
  volume24h: 1e3,
  change1h: -5,
  change24h: 1,
  change7d: -2,
  rsi: 80,
  macdSignal: "bearish",
  fearGreed: 92,
};
const vetoGate = evaluateNexusGate(vetoSnap);
const veto = enforceAgentGate(vetoSnap, { action: "BUY", confidence: 90, reasoning: "Agent wants BUY" });

const ok =
  ev.signal &&
  ev.tier &&
  typeof ev.confidence === "number" &&
  ev.checks.length >= 6 &&
  typeof bt.totalReturnPct === "number" &&
  typeof bt.maxDrawdownPct === "number" &&
  typeof bt.winRatePct === "number" &&
  structured.schema === "nexus-momentum-gate/v1" &&
  vetoGate.signal === "AVOID" &&
  veto.overridden === true &&
  veto.finalAction === "HOLD";

console.log(
  JSON.stringify(
    {
      ok,
      ev: { signal: ev.signal, tier: ev.tier, confidence: ev.confidence },
      bt: {
        return: bt.totalReturnPct,
        maxDrawdown: bt.maxDrawdownPct,
        winRate: bt.winRatePct,
        trades: bt.trades,
      },
      veto: { finalAction: veto.finalAction, overridden: veto.overridden },
    },
    null,
    2,
  ),
);
process.exit(ok ? 0 : 1);
