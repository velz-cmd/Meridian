"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, ShieldBan } from "lucide-react";
import { cn } from "@/lib/utils";

export type GateHandoff = {
  symbol: string;
  permit?: "GRANT" | "DENY";
  permitId?: string;
};

export function NexusGateBanner({ handoff }: { handoff: GateHandoff }) {
  const granted = handoff.permit === "GRANT";

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        granted
          ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-50"
          : "border-amber-400/30 bg-amber-500/10 text-amber-50",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {granted ? (
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
          ) : (
            <ShieldBan className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          )}
          <div>
            <p className="font-semibold">
              Gate handoff · {handoff.symbol}{" "}
              {handoff.permit ? (
                <span className={granted ? "text-emerald-200" : "text-amber-200"}>{handoff.permit}</span>
              ) : null}
            </p>
            <p className="mt-0.5 text-xs opacity-85">
              {granted
                ? "Constitution cleared sizing — connect wallet and sign PancakeSwap swap on BSC Testnet."
                : "Constitution denied BUY — desk open for research; buy tab stays blocked until permit clears."}
            </p>
            {handoff.permitId && (
              <code className="mt-1 block text-[10px] opacity-70">{handoff.permitId.slice(0, 48)}…</code>
            )}
          </div>
        </div>
        <Link
          href="/gate"
          className="inline-flex shrink-0 items-center gap-1 text-xs opacity-80 transition hover:opacity-100"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Gate
        </Link>
      </div>
    </div>
  );
}
