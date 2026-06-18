import type { Metadata } from "next";
import { GateConsole } from "@/components/gate/gate-console";

export const metadata: Metadata = {
  title: "MERIDIAN · Momentum router",
  description: "Live BSC momentum scan — ranked setups, rule checks, and testnet execution.",
  openGraph: {
    title: "MERIDIAN Momentum router",
    description: "Ranked BSC setups with auditable rules and historical replay.",
  },
};

export default function GatePage() {
  return <GateConsole />;
}
