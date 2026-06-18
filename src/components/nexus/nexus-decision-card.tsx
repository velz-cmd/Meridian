"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Crosshair,
  ExternalLink,
  Copy,
  Check,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { useState } from "react";
import { ArcIconBadge } from "@/components/ui/arc-icon-badge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCompact, formatPct, formatUsd, truncateHash } from "@/lib/utils";
import type { NexusDecision } from "@/lib/storage";
import { filterReasoningFactorsForDisplay } from "@/lib/reasoning-factors";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";

export function NexusDecisionCard({
  decision,
  selected,
  onSelect,
}: {
  decision: NexusDecision;
  selected: boolean;
  onSelect: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    await navigator.clipboard.writeText(decision.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "arc-glass-card w-full p-5 text-left transition",
        selected
          ? "arc-glass-card-nexus arc-glass-interactive border-emerald-400/40 shadow-[0_0_24px_-6px_var(--nexus-glow)]"
          : "arc-glass-interactive hover:border-emerald-400/30",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {decision.icon ? (
            <img src={decision.icon} alt="" className="h-11 w-11 rounded-xl border border-white/10" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-sm font-bold text-cyan-200">
              {decision.symbol.slice(0, 2)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold">{decision.symbol}</span>
              <Badge
                variant={
                  decision.action === "BUY" ? "buy" : decision.action === "SELL" ? "sell" : "hold"
                }
              >
                {decision.action}
              </Badge>
              {decision.swappable !== false && (
                <Badge variant="nexus" className="normal-case tracking-normal">
                  Chapel desk
                </Badge>
              )}
            </div>
            <p className="text-xs text-white/45">{decision.name ?? decision.chainId}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-medium">{formatUsd(decision.priceUsd)}</p>
          <p className={decision.change24h >= 0 ? "text-emerald-300" : "text-rose-300"}>
            {formatPct(decision.change24h)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            copyAddress();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/70 hover:bg-white/10"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-300" /> : <Copy className="h-3 w-3" />}
          {truncateHash(decision.token, 8, 6)}
        </button>
        <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1.5 text-[11px] text-emerald-200">
          0x {decision.chainId}
        </span>
        {decision.dexUrl && (
          <a
            href={decision.dexUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-cyan-200/80 hover:bg-white/5"
          >
            Market chart <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="MCap" value={decision.intel?.marketCap ? formatCompact(decision.intel.marketCap) : "—"} />
        <Metric label="Liquidity" value={formatCompact(decision.liquidityUsd ?? 0)} />
        <Metric
          label="Snipers"
          value={decision.intel?.sniperCount != null ? String(decision.intel.sniperCount) : "—"}
          warn={(decision.intel?.sniperCount ?? 0) > 5}
        />
        <Metric
          label="Holders"
          value={decision.intel?.holderCount != null ? decision.intel.holderCount.toLocaleString() : "—"}
        />
      </div>

      <div className="mt-3 text-[11px] text-white/40">
        Confidence {decision.confidence}% · Risk {decision.riskScore}/100
      </div>
    </motion.button>
  );
}

function Metric({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${warn ? "border-amber-400/30 bg-amber-400/5" : "border-white/8 bg-white/[0.02]"}`}
    >
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">{label}</p>
      <p className="mt-1 text-sm font-medium text-white/90">{value}</p>
    </div>
  );
}

function ImpactIcon({ impact }: { impact: "bullish" | "bearish" | "neutral" }) {
  if (impact === "bullish") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (impact === "bearish") return <TrendingDown className="h-4 w-4 text-rose-400" />;
  return <Minus className="h-4 w-4 text-white/50" />;
}

function FactorRow({
  label,
  detail,
  impact,
}: {
  label: string;
  detail: string;
  impact: "bullish" | "bearish" | "neutral";
}) {
  const border =
    impact === "bullish"
      ? "border-l-emerald-400"
      : impact === "bearish"
        ? "border-l-rose-400"
        : "border-l-white/25";
  const bg =
    impact === "bullish"
      ? "bg-emerald-500/[0.06]"
      : impact === "bearish"
        ? "bg-rose-500/[0.06]"
        : "bg-white/[0.04]";

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-white/8 border-l-[3px] px-3 py-2.5 ${border} ${bg}`}
    >
      <ImpactIcon impact={impact} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-white/78">{detail}</p>
      </div>
    </div>
  );
}

export function NexusTokenDetail({ decision }: { decision: NexusDecision | null }) {
  if (!decision) {
    return (
      <div className="arc-signal-panel arc-signal-panel-nexus flex min-h-[80px] flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white/45">
        <ArcIconBadge icon={Crosshair} theme="nexus" size="sm" />
        Select a token for verdict and intel
      </div>
    );
  }

  const factors = filterReasoningFactorsForDisplay(decision.reasoningFactors ?? [], 6);
  const bullish = factors.filter((f) => f.impact === "bullish").length;
  const bearish = factors.filter((f) => f.impact === "bearish").length;
  const summaryHint = `${decision.action} · ${decision.confidence}% conf · risk ${decision.riskScore} · ${bullish}↑ ${bearish}↓`;

  return (
    <div className="space-y-2">
      <div className="arc-glass-card arc-glass-card-nexus flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <ArcIconBadge icon={Brain} theme="nexus" size="sm" />
          <Badge
            variant={decision.action === "BUY" ? "buy" : decision.action === "SELL" ? "sell" : "hold"}
          >
            {decision.action}
          </Badge>
          <span className="text-base font-semibold text-white">
            {decision.symbol} · {formatUsd(decision.priceUsd)}
          </span>
        </div>
        <span className="arc-caption text-white/75">
          Confidence <span className="text-emerald-200">{decision.confidence}%</span>
          <span className="mx-1.5 text-white/30">·</span>
          Risk <span className="text-amber-200">{decision.riskScore}/100</span>
        </span>
      </div>

      <NexusCollapsible
        label="Agent reasoning"
        hint={summaryHint}
        variant="reasoning"
        icon={Brain}
        defaultOpen={false}
      >
        <p className="nexus-lead rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-2.5">
          {decision.whyAction ?? decision.reasoning}
        </p>
        {factors.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="nexus-caption">Signal breakdown</p>
            {factors.map((f) => (
              <FactorRow key={f.label} label={f.label} detail={f.detail} impact={f.impact} />
            ))}
          </div>
        )}
      </NexusCollapsible>
    </div>
  );
}
