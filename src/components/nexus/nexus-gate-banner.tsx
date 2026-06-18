"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, ShieldBan } from "lucide-react";
import { cn } from "@/lib/utils";
import { gateSymbolTradableOnTestnet } from "@/lib/gate-product-copy";

export type GateHandoff = {
  symbol: string;
  permit?: "GRANT" | "DENY";
  permitId?: string;
  scroll?: "constitution" | "trade";
};

export function NexusGateBanner({ handoff }: { handoff: GateHandoff }) {
  const granted = handoff.permit === "GRANT";
  const tradable = gateSymbolTradableOnTestnet(handoff.symbol);

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        granted
          ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-50"
          : "border-white/15 bg-white/5 text-white/85",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {granted ? (
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
          ) : (
            <ShieldBan className="mt-0.5 h-4 w-4 shrink-0 text-white/50" />
          )}
          <div>
            <p className="font-semibold">
              {handoff.symbol} · {granted ? "entry cleared" : "entry blocked"}
            </p>
            <p className="mt-0.5 text-xs opacity-85">
              {tradable
                ? granted
                  ? "Connect wallet on BSC Testnet to sign the swap."
                  : "Buy stays blocked until rules clear a long entry."
                : `${handoff.symbol} is analysis-only here — use BNB or CAKE on testnet for signed swaps.`}
            </p>
          </div>
        </div>
        <Link
          href="/gate"
          className="inline-flex shrink-0 items-center gap-1 text-xs opacity-70 transition hover:opacity-100"
        >
          <ArrowLeft className="h-3 w-3" /> Back to router
        </Link>
      </div>
    </div>
  );
}
