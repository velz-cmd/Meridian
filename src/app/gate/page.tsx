import type { Metadata } from "next";
import { GateConsole } from "@/components/gate/gate-console";

export const metadata: Metadata = {
  title: "MERIDIAN · Strategy skill desk",
  description: "Live CMC rules, historical replay, and testnet execution — one deterministic strategy harness.",
  openGraph: {
    title: "MERIDIAN Momentum router",
    description: "Ranked BSC setups with auditable rules and historical replay.",
  },
};

export default function GatePage() {
  return <GateConsole />;
}
