"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldBan,
  ShieldCheck,
  Loader2,
  ArrowRight,
  Copy,
  Check,
  Scale,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { cn } from "@/lib/utils";
import type { ConstitutionPermitPayload } from "@/hooks/use-constitution-permit";
import type { AgentSignal } from "@/lib/storage";

export function NexusConstitutionDesk({
  payload,
  loading,
  error,
  agent,
  symbol,
}: {
  payload: ConstitutionPermitPayload | null;
  loading: boolean;
  error: string | null;
  agent?: AgentSignal;
  symbol: string;
}) {
  const permit = payload?.permit;
  const cf = payload?.counterfactual;
  const [copied, setCopied] = useState(false);

  const copyPermit = useCallback(async () => {
    if (!payload) return;
    await navigator.clipboard.writeText(JSON.stringify(payload.permit, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [payload]);

  const granted = permit?.status === "GRANT";
  const vetoed = permit?.overridden ?? false;

  return (
    <div id="nexus-constitution-desk" className="arc-glass-card arc-glass-card-nexus arc-border-trace relative overflow-hidden">
      <div className="arc-panel-stripe arc-panel-stripe-nexus" />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-40",
          granted ? "bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" : "bg-gradient-to-br from-rose-500/10 via-transparent to-transparent",
        )}
      />

      <div className="relative space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <ArcIcon3d icon={Scale} theme="nexus" size="md" />
            <div>
              <p className="arc-caption text-emerald-300/90">MERIDIAN · Constitution Permit</p>
              <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                Agent trade permit · {symbol}
              </h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/55 sm:text-sm">
                CMC Strategy Skill runtime — agents must earn a permit before sizing. Not research:{" "}
                <strong className="font-medium text-white/80">GRANT</strong> or{" "}
                <strong className="font-medium text-white/80">DENY</strong> with receipt.
              </p>
            </div>
          </div>
          {permit && !loading && (
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2.5 shadow-lg",
                granted
                  ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-50"
                  : "border-rose-400/50 bg-rose-500/20 text-rose-50",
              )}
            >
              {granted ? <ShieldCheck className="h-5 w-5" /> : <ShieldBan className="h-5 w-5" />}
              <span className="text-sm font-bold tracking-wide">{permit.status}</span>
            </motion.div>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/60">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            Issuing permit via CoinMarketCap + desk fusion…
          </div>
        )}

        {error && !loading && (
          <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </p>
        )}

        <AnimatePresence mode="wait">
          {permit && !loading && (
            <motion.div
              key={permit.permitId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
                <ArbitrationCell
                  label="Agent proposes"
                  value={agent?.action ?? permit.agentRequested ?? "—"}
                  sub={`${agent?.confidence ?? permit.confidence}% conf`}
                  tone="violet"
                  dimmed={vetoed}
                />
                <ArrowRight className="mx-auto hidden h-5 w-5 text-white/25 sm:block" />
                <ArbitrationCell
                  label="Constitution"
                  value={permit.constitutionSignal.replace("_", " ")}
                  sub={`${permit.gate.checksPassed}/${permit.gate.checksTotal} checks · ${permit.tier}`}
                  tone="cyan"
                />
                <ArrowRight className="mx-auto hidden h-5 w-5 text-white/25 sm:block" />
                <ArbitrationCell
                  label="Execution"
                  value={granted ? "PERMITTED" : "BLOCKED"}
                  sub={permit.execute}
                  tone={granted ? "emerald" : "rose"}
                  highlight
                />
              </div>

              {vetoed && (
                <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  <strong className="font-semibold">Veto active.</strong> Agent requested{" "}
                  {permit.agentRequested} — constitution blocked entry. This is the daily-use loop: AI suggests,
                  rules decide.
                </div>
              )}

              <p className="text-sm leading-relaxed text-white/85">{permit.thesis}</p>

              {cf && (
                <div className="rounded-xl border border-white/10 bg-black/35 p-4">
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                    <Shield className="h-3.5 w-3.5" />
                    Counterfactual backtest · same bars
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <CompareCard
                      title="Naive momentum agent"
                      sub="Buys every green day — no constitution"
                      returnPct={cf.naiveAgent.totalReturnPct}
                      dd={cf.naiveAgent.maxDrawdownPct}
                      win={cf.naiveAgent.winRatePct}
                      negative
                    />
                    <CompareCard
                      title="Constitution gated"
                      sub="Same CMC skill rules · live on NEXUS"
                      returnPct={cf.constitution.totalReturnPct}
                      dd={cf.constitution.maxDrawdownPct}
                      win={cf.constitution.winRatePct}
                      accent
                    />
                  </div>
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/60">
                    {cf.edge.drawdownSavedPct > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-200">
                        <TrendingDown className="h-3 w-3" />
                        {cf.edge.drawdownSavedPct}% less drawdown
                      </span>
                    )}
                    {cf.edge.returnDeltaPct !== 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-cyan-200">
                        <TrendingUp className="h-3 w-3" />
                        {cf.edge.returnDeltaPct > 0 ? "+" : ""}
                        {cf.edge.returnDeltaPct}% return vs naive
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                <p className="text-[10px] text-white/40">
                  {payload?.cmcLive ? "CMC live" : "Desk fusion"} · {permit.permitId.slice(0, 24)}…
                </p>
                <button
                  type="button"
                  onClick={() => void copyPermit()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy permit JSON"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ArbitrationCell({
  label,
  value,
  sub,
  tone,
  dimmed,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "violet" | "cyan" | "emerald" | "rose";
  dimmed?: boolean;
  highlight?: boolean;
}) {
  const border = {
    violet: "border-violet-400/30 bg-violet-500/10",
    cyan: "border-cyan-400/30 bg-cyan-500/10",
    emerald: "border-emerald-400/40 bg-emerald-500/15",
    rose: "border-rose-400/40 bg-rose-500/15",
  }[tone];

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 text-center sm:text-left",
        border,
        dimmed && "opacity-45 line-through decoration-white/30",
        highlight && "ring-1 ring-white/20",
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-white">{value}</p>
      <p className="text-[10px] text-white/50">{sub}</p>
    </div>
  );
}

function CompareCard({
  title,
  sub,
  returnPct,
  dd,
  win,
  accent,
  negative,
}: {
  title: string;
  sub: string;
  returnPct: number;
  dd: number;
  win: number;
  accent?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5",
        accent ? "border-emerald-400/25 bg-emerald-500/[0.07]" : "border-white/10 bg-black/25",
      )}
    >
      <p className="text-xs font-semibold text-white">{title}</p>
      <p className="text-[10px] text-white/45">{sub}</p>
      <div className="mt-2 flex flex-wrap gap-3 text-xs tabular-nums">
        <span className={negative ? "text-rose-300" : "text-emerald-300"}>{returnPct}% ret</span>
        <span className="text-white/55">{dd}% DD</span>
        <span className="text-white/55">{win}% win</span>
      </div>
    </div>
  );
}
