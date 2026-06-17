"use client";

import { AlertTriangle, Database, ExternalLink, History, Shield, Users } from "lucide-react";
import { isStablecoin } from "@/lib/token-filters";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { bscExplorerTx } from "@/lib/bsc-chain";
import { formatCompact, formatPct, formatUsd, truncateHash } from "@/lib/utils";
import type { NexusDecision } from "@/lib/storage";

function topFactor(decision: NexusDecision) {
  const f = decision.reasoningFactors?.[0];
  if (!f) return decision.whyAction?.slice(0, 80) ?? "Scan snapshot";
  return `${f.label}: ${f.detail.slice(0, 60)}`;
}

function isScamSnapshot(decision: NexusDecision) {
  return (
    decision.reasoningFactors?.some((f) => f.label === "Scam check") ||
    (decision.action === "SELL" && decision.riskScore >= 78) ||
    decision.whyAction?.toLowerCase().includes("scam alert")
  );
}

export function NexusMemoryList({
  decisions,
  selectedId,
  onSelect,
}: {
  decisions: NexusDecision[];
  selectedId: string | null;
  onSelect: (d: NexusDecision) => void;
}) {
  if (decisions.length === 0) {
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-cyan-400/25 bg-cyan-500/5 p-8 text-center">
        <Database className="mx-auto h-10 w-10 text-cyan-300/60" />
        <h3 className="text-base font-semibold text-white">Agent Memory — your scan archive</h3>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-white/60">
          <strong className="text-white/80">Memory Scan</strong> archives up to 15 tokens with scam/risk
          flags, market intelligence, and BUY/SELL/HOLD reasoning at that moment — a local journal, not a
          guaranteed safe list.
        </p>
        <p className="text-xs text-white/45">
          Memory Scan = 15 archived · Alpha Scan = ranked opportunities (separate tab)
        </p>
      </div>
    );
  }

  const visible = decisions.filter((d) => !isStablecoin(d.symbol, d.name));

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2.5 text-xs text-cyan-100/90">
        <p className="flex items-center gap-1.5 font-semibold">
          <History className="h-3.5 w-3.5" />
          {visible.length} archived snapshots
        </p>
        <p className="mt-1 text-white/55">
          Market data, wallet signals, and scam checks per token. Rugs show SELL / scam badge — not blind HOLD.
        </p>
      </div>

      <div className="space-y-1.5">
        {visible.map((decision) => {
          const scam = isScamSnapshot(decision);
          const selected = selectedId === decision.id;
          return (
            <button
              key={decision.id}
              type="button"
              onClick={() => onSelect(decision)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                selected
                  ? "border-cyan-400/45 bg-cyan-400/10 ring-1 ring-cyan-400/25"
                  : "border-white/10 bg-black/25 hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {decision.icon ? (
                    <img src={decision.icon} alt="" className="h-8 w-8 rounded-lg border border-white/10" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[10px] font-bold">
                      {decision.symbol.slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-white">{decision.symbol}</span>
                      <Badge
                        variant={
                          decision.action === "BUY"
                            ? "buy"
                            : decision.action === "SELL"
                              ? "sell"
                              : "hold"
                        }
                        className="!text-[9px]"
                      >
                        {decision.action}
                      </Badge>
                      {scam && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-rose-500/25 px-1.5 py-0.5 text-[9px] font-bold text-rose-200">
                          <AlertTriangle className="h-3 w-3" />
                          SCAM
                        </span>
                      )}
                      <span className="text-[10px] text-white/40">
                        {formatDistanceToNow(new Date(decision.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-[11px] text-white/55">{topFactor(decision)}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right text-[10px] text-white/50">
                  <p>{formatUsd(decision.priceUsd)}</p>
                  <p className={decision.change24h >= 0 ? "text-emerald-300" : "text-rose-300"}>
                    {formatPct(decision.change24h)}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-white/45">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {decision.intel?.holderCount != null
                    ? `${decision.intel.holderCount.toLocaleString()} holders`
                    : "holders —"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Liq {formatCompact(decision.liquidityUsd ?? 0)}
                </span>
                {decision.arcFeeTxHash && (
                  <a
                    href={bscExplorerTx(decision.arcFeeTxHash)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-0.5 text-cyan-300/80 hover:underline"
                  >
                    Arc {truncateHash(decision.arcFeeTxHash, 4, 4)}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
