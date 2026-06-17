"use client";

import { useEffect, useState, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldBan,
  ShieldCheck,
  Loader2,
  ArrowRight,
  Scale,
  TrendingDown,
  TrendingUp,
  Wifi,
  WifiOff,
} from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { cn } from "@/lib/utils";
import type { ConstitutionPermitPayload } from "@/hooks/use-constitution-permit";
import type { AgentSignal } from "@/lib/storage";
import { readPermitLog, type PermitLogEntry } from "@/lib/constitution-permit-log";
import { useConstitutionCompare } from "@/hooks/use-constitution-compare";

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
  const cfMeta = payload?.counterfactualMeta;
  const [statusProbe, setStatusProbe] = useState<{ live?: boolean } | null>(null);
  const [log, setLog] = useState<PermitLogEntry[]>([]);
  const compare = useConstitutionCompare();

  useEffect(() => {
    setLog(readPermitLog());
  }, [payload?.permit?.permitId]);

  useEffect(() => {
    void fetch("/api/constitution/status")
      .then((r) => r.json())
      .then((j) => setStatusProbe({ live: j.cmc?.live }))
      .catch(() => setStatusProbe(null));
  }, []);

  const granted = permit?.status === "GRANT";
  const vetoed = permit?.overridden ?? false;
  const cmcConnected = payload?.cmcLive ?? statusProbe?.live;

  return (
    <div
      id="nexus-constitution-desk"
      className="arc-glass-card arc-glass-card-nexus arc-border-trace relative overflow-hidden"
    >
      <div className="arc-panel-stripe arc-panel-stripe-nexus" />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-40",
          granted ? "bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" : "bg-gradient-to-br from-rose-500/10 via-transparent to-transparent",
        )}
      />

      <div className="relative space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
          <StatusPill
            icon={cmcConnected ? Wifi : WifiOff}
            label={cmcConnected ? "Live market gate" : "Market gate"}
            tone={cmcConnected ? "emerald" : "amber"}
          />
          {permit?.gate?.regime && (
            <StatusPill icon={Scale} label={`${permit.gate.regime} regime`} tone="amber" />
          )}
          {permit?.gate && (
            <StatusPill
              icon={Shield}
              label={`${permit.gate.checksPassed}/${permit.gate.checksTotal} checks`}
              tone="cyan"
            />
          )}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <ArcIcon3d icon={Scale} theme="nexus" size="md" />
            <div>
              <p className="arc-caption text-emerald-300/90">Pre-trade risk permit</p>
              <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                Trade permit · {symbol}
              </h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/55 sm:text-sm">
                Agents must earn a permit before sizing. Not research:{" "}
                <strong className="font-medium text-white/80">GRANT</strong> or{" "}
                <strong className="font-medium text-white/80">DENY</strong> before execution.
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
            Issuing trade permit…
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
                  <strong className="font-semibold">Veto active.</strong>{" "}
                  {(permit as { blockReason?: string }).blockReason ??
                    `Agent requested ${permit.agentRequested} — constitution blocked.`}
                </div>
              )}

              {!granted && (permit as { blockReason?: string }).blockReason && !vetoed && (
                <div className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  <strong className="font-semibold">Permit denied.</strong>{" "}
                  {(permit as { blockReason?: string }).blockReason}
                </div>
              )}

              {!granted && !(permit as { blockReason?: string }).blockReason && !vetoed && (
                <div className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  <strong className="font-semibold">Permit denied.</strong> Constitution has not cleared this action.
                </div>
              )}

              <p className="text-sm leading-relaxed text-white/85">{permit.thesis}</p>

              {cf && (
                <div className="rounded-xl border border-white/10 bg-black/35 p-4">
                  <p className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                    <Shield className="h-3.5 w-3.5" />
                    Illustrative simulation
                    {cfMeta?.mode && (
                      <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 font-mono normal-case tracking-normal text-amber-100">
                        synthetic · {cfMeta.mode}
                        {cfMeta.anchorPrice ? ` · anchor $${cfMeta.anchorPrice.toFixed(2)}` : ""}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/50">
                    Not historical CMC bars — shows how the gate would behave vs a naive momentum agent on
                    calibrated synthetic price paths. Reproducible 90-day backtest:{" "}
                    <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-[10px] text-cyan-200/90">
                      npm run bnb:backtest
                    </code>
                  </p>
                  {cfMeta?.note && (
                    <p className="mt-1 text-[11px] leading-relaxed text-white/40">{cfMeta.note}</p>
                  )}

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <EdgeMetric
                      label="Drawdown saved"
                      value={`${cf.edge.drawdownSavedPct}%`}
                      sub="vs naive agent"
                      positive={cf.edge.drawdownSavedPct > 0}
                      icon={TrendingDown}
                      prominent
                    />
                    <EdgeMetric
                      label="Return delta"
                      value={`${cf.edge.returnDeltaPct > 0 ? "+" : ""}${cf.edge.returnDeltaPct}%`}
                      sub="constitution vs naive"
                      positive={cf.edge.returnDeltaPct >= 0}
                      icon={TrendingUp}
                      prominent
                    />
                    <EdgeMetric
                      label="Win rate delta"
                      value={`${cf.edge.winRateDeltaPct > 0 ? "+" : ""}${cf.edge.winRateDeltaPct}%`}
                      sub="gated entries"
                      positive={cf.edge.winRateDeltaPct >= 0}
                      icon={TrendingUp}
                    />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                </div>
              )}

              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-white/70">Compare core markets</p>
                  <button
                    type="button"
                    disabled={compare.loading}
                    onClick={() => void compare.compare(["BNB", "CAKE"])}
                    className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                  >
                    {compare.loading ? "Fetching…" : "Compare BNB vs CAKE"}
                  </button>
                </div>
                {compare.error && <p className="mt-2 text-xs text-rose-200">{compare.error}</p>}
                {Object.keys(compare.results).length > 0 && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(["BNB", "CAKE"] as const).map((sym) => {
                      const row = compare.results[sym];
                      if (!row?.permit) return null;
                      return (
                        <div
                          key={sym}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-left",
                            row.permit.status === "GRANT"
                              ? "border-emerald-400/30 bg-emerald-500/10"
                              : "border-rose-400/30 bg-rose-500/10",
                          )}
                        >
                          <p className="text-sm font-bold text-white">{sym}</p>
                          <p className="text-xs text-white/60">
                            {row.permit.status} · {row.permit.gate?.regime ?? "—"} · {row.permit.gate.checksPassed}/
                            {row.permit.gate.checksTotal} checks
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {log.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Session permit log</p>
                  <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-[11px] text-white/55">
                    {log.slice(0, 8).map((e) => (
                      <li key={e.permitId} className="flex justify-between gap-2 font-mono">
                        <span>
                          {e.symbol} · {e.status}
                          {e.regime ? ` · ${e.regime}` : ""}
                        </span>
                        <span className="text-white/35">{e.at.slice(11, 19)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="border-t border-white/[0.06] pt-3 text-[10px] text-white/40">
                Public view hides infrastructure details. Private ops keeps full API health and receipts.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatusPill({
  icon: Icon,
  label,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  tone: "emerald" | "amber" | "cyan" | "violet" | "neutral";
}) {
  const colors = {
    emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-400/30 bg-amber-500/10 text-amber-100",
    cyan: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
    violet: "border-violet-400/30 bg-violet-500/10 text-violet-100",
    neutral: "border-white/15 bg-white/5 text-white/60",
  }[tone];

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", colors)}>
      <Icon className="h-3 w-3 shrink-0" />
      {label}
    </span>
  );
}

function EdgeMetric({
  label,
  value,
  sub,
  positive,
  icon: Icon,
  prominent,
}: {
  label: string;
  value: string;
  sub: string;
  positive: boolean;
  icon: ComponentType<{ className?: string }>;
  prominent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 text-center",
        prominent
          ? positive
            ? "border-emerald-400/35 bg-emerald-500/15"
            : "border-rose-400/30 bg-rose-500/10"
          : "border-white/10 bg-black/25",
      )}
    >
      <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-white/45">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-bold tabular-nums",
          positive ? "text-emerald-200" : "text-rose-200",
        )}
      >
        {value}
      </p>
      <p className="text-[10px] text-white/45">{sub}</p>
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
