import type { Metadata } from "next";
import { BnbAnalyticsDashboard } from "@/components/analytics/bnb-analytics-dashboard";

export const metadata: Metadata = {
  title: "MERIDIAN · Analytics",
  description:
    "Product telemetry — gate scans, testnet trades, API usage, and platform activity.",
  openGraph: {
    title: "MERIDIAN analytics",
    description: "Public usage and execution stats for the MERIDIAN platform.",
  },
};

export default function AnalyticsPage() {
  return <BnbAnalyticsDashboard />;
}
