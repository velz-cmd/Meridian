import type { Metadata } from "next";
import { GateConsole } from "@/components/gate/gate-console";

export const metadata: Metadata = {
  title: "MERIDIAN Gate · BSC Capital Router",
  description:
    "Constitution-backed capital router for BSC agents — rank BNB vs CAKE, issue permits, prove regime discipline on CoinMarketCap data.",
  openGraph: {
    title: "MERIDIAN Gate · CMC Strategy Skill",
    description: "CMC-only strategy gate — no synthetic data in live API.",
  },
};

export default function GatePage() {
  return <GateConsole />;
}
