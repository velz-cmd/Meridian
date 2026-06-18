import type { Metadata } from "next";
import { GateConsole } from "@/components/gate/gate-console";

export const metadata: Metadata = {
  title: "MERIDIAN · CMC Strategy Skill",
  description:
    "CoinMarketCap market data turned into a backtestable momentum strategy — entry/exit rules and 90-day proof.",
  openGraph: {
    title: "MERIDIAN Momentum Constitution · CMC Strategy Skill",
    description: "Quantopian-style strategy from CMC data — SKILL.md + STRATEGY_SPEC + backtest.",
  },
};

export default function GatePage() {
  return <GateConsole />;
}
