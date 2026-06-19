import type { Metadata } from "next";
import { BnbAnalyticsDashboard } from "@/components/analytics/bnb-analytics-dashboard";

export const metadata: Metadata = {
  title: "MERIDIAN · BNB Hack analytics",
  description:
    "Live traction dashboard — CMC gate scans, BSC Testnet Chapel swaps, Dune on-chain metrics, and platform usage for BNB Hack judges.",
  openGraph: {
    title: "MERIDIAN BNB analytics",
    description: "Public stats for Strategy Skills track + BSC Testnet execution.",
  },
};

export default function AnalyticsPage() {
  return <BnbAnalyticsDashboard />;
}
