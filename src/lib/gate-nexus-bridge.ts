import type { GateSymbol } from "@/lib/gate-constants";
import { GATE_SKILL_REPO, isGateSymbol } from "@/lib/gate-constants";
import { BSC_CHAIN_ID, BSC_CHAIN_LABEL } from "@/lib/bsc-chain";

/** Map CMC gate benchmark → BSC Testnet desk symbol (PancakeSwap V2). */
export function gateSymbolToDeskSymbol(symbol: string): GateSymbol | string {
  const s = symbol.replace(/^\$/, "").trim().toUpperCase();
  if (isGateSymbol(s)) return s;
  if (s === "TBNB" || s === "WBNB") return "BNB";
  return s;
}

export function buildGateExecutionUrl(input: {
  symbol: string;
  permit?: "GRANT" | "DENY";
  permitId?: string;
  tab?: "trade";
  action?: "buy" | "sell" | "agent";
  direction?: "LONG" | "SHORT" | "FLAT";
  leverage?: number;
  auto?: boolean;
}): string {
  const params = new URLSearchParams();
  params.set("from", "gate");
  params.set("symbol", gateSymbolToDeskSymbol(input.symbol));
  if (input.permit) params.set("permit", input.permit);
  if (input.permitId) params.set("permitId", input.permitId);
  params.set("tab", input.tab ?? "trade");
  if (input.action) params.set("action", input.action);
  if (input.direction) params.set("direction", input.direction);
  if (input.leverage != null && input.leverage > 0) params.set("leverage", String(Math.round(input.leverage)));
  if (input.auto) params.set("auto", "1");
  return `/nexus?${params.toString()}`;
}

export type PipelineLayer = {
  id: string;
  name: string;
  status: "ready" | "live" | "degraded" | "blocked";
  detail: string;
  artifact?: string;
  endpoint?: string;
};

export const GATE_PIPELINE_LAYERS: Omit<PipelineLayer, "status" | "detail">[] = [
  {
    id: "skill",
    name: "CMC Strategy Skill",
    artifact: `${GATE_SKILL_REPO}/SKILL.md`,
  },
  {
    id: "spec",
    name: "Backtestable strategy spec",
    artifact: `${GATE_SKILL_REPO}/STRATEGY_SPEC.md`,
  },
  {
    id: "backtest",
    name: "Quantopian-style proof",
    endpoint: "/api/gate/backtest",
  },
  {
    id: "live",
    name: "Live CMC gate + permit",
    endpoint: "/api/gate/evaluate",
  },
  {
    id: "agent",
    name: "Autonomous agent arbitration",
    endpoint: "/api/gate/route",
  },
  {
    id: "execution",
    name: "On-chain DEX settlement",
  },
];

export function pipelineLayerMeta(id: string) {
  return GATE_PIPELINE_LAYERS.find((l) => l.id === id);
}

export const GATE_STACK_SUMMARY = {
  chainId: BSC_CHAIN_ID,
  chain: BSC_CHAIN_LABEL,
  dex: "PancakeSwap V2 (Chapel)",
  settlement: "wallet-signed swap txs on BSC Testnet",
  reproducible: "npm run bnb:backtest -- --symbol BNB --days 90",
};
