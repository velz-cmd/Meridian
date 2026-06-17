import type { Metadata } from "next";
import { GateConsole } from "@/components/gate/gate-console";

export const metadata: Metadata = {
  title: "MERIDIAN Gate · CMC Strategy Skill",
  description:
    "CoinMarketCap-backed pre-trade gate for AI trading agents. Live evaluation and real historical backtest — BNB Hack Track 2.",
  openGraph: {
    title: "MERIDIAN Gate · CMC Strategy Skill",
    description: "CMC-only strategy gate — no synthetic data in live API.",
  },
};

export default function GatePage() {
  return <GateConsole />;
}
