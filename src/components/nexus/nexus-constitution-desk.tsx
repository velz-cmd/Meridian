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
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { cn } from "@/lib/utils";
import type { ConstitutionPermitPayload } from "@/hooks/use-constitution-permit";
import type { AgentSignal } from "@/lib/storage";
import { HACKATHON_DEMO_SYMBOLS } from "@/lib/hackathon-demo";

function verdictHeadline(
  permit: NonNullable<ConstitutionPermitPayload["permit"]>,
  granted: boolean,
): string {
  const agent = permit.agentRequested ?? "HOLD";
  const signal = permit.constitutionSignal.replace("_", " ");

  if (granted && agent === "BUY") {
    return "Agent may size in — risk gate cleared this entry.";
  }
  if (!granted && agent === "BUY") {
    return "Buy blocked — agent confidence does not override the gate.";
  }
  if (granted && agent === "SELL") {
    return "Exit allowed — gate confirms de-risk on this tape.";
  }
  if (!granted && agent === "SELL") {
    return "Sell blocked — gate still favors holding exposure.";
  }
  return granted
    ? `Permit granted — constitution reads ${signal}.`
    : `Permit denied — constitution reads ${signal}.`;
}

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
  const [statusProbe, setStatusProbe] = useState<{ live?: boolean } | null>(null);
  const sym = symbol.toUpperCase();
  const isBenchmark = (HACKATHON_DEMO_SYMBOLS as readonly string[]).includes(sym);

  useEffect(() => {
    void fetch("/api/constitution/status")
      .then((r) => r.json())
      .then((j) => setStatusProbe({ live: j.cmc?.live }))
      .catch(() => setStatusProbe(null));
  }, []);

  const granted = permit?.status === "GRANT";
  const vetoed = permit?.overridden ?? false;
  const liveGate = payload?.cmcLive ?? statusProbe?.live;
  const failedChecks = permit?.gate.checks.filter((c) => !c.pass) ?? [];
  const passedChecks = permit?.gate.checks.filter((c) => c.pass) ?? [];

  return (
    <div
      id="nexus-constitution-desk"
      className="arc-glass-card arc-glass-card-nexus arc-border-trace relative overflow-hidden"
    >
      <div className="arc-panel-stripe arc-panel-stripe-nexus" />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-40",
          granted
            ? "bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent"
            : "bg-gradient-to-br from-rose-500/10 via-transparent to-transparent",
        )}
      />

      <div className="relative space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <ArcIcon3d icon={Scale} theme="nexus" size="md" />
            <div>
              <p className="arc-caption text-emerald-300/90">Risk gate · {sym}</p>
              <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                {loading ? "Evaluating permit…" : granted ? "Trade cleared" : "Trade blocked"}
              </h2>
              {permit && !loading && (
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/70">
                  {verdictHeadline(permit, granted)}
                </p>
              )}
              {!permit && !loading && !error && (
                <p className="mt-1 text-sm text-white/55">Waiting for live market inputs…</p>
              )}
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

        <div className="flex flex-wrap items-center gap-2">
          <StatusPill
            icon={liveGate ? Wifi : WifiOff}
            label={liveGate ? "Live gate" : "Desk gate"}
            tone={liveGate ? "emerald" : "amber"}
          />
          {permit?.gate?.regime && (
            <StatusPill icon={Scale} label={`${permit.gate.regime} tape`} tone="amber" />
          )}
          {permit?.gate && (
            <StatusPill
              icon={Shield}
              label={`${permit.gate.checksPassed}/${permit.gate.checksTotal} passed`}
              tone={permit.gate.checksPassed === permit.gate.checksTotal ? "emerald" : "cyan"}
            />
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/60">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            Running weighted gate on {sym}…
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
                  label="Strategy"
                  value={agent?.action ?? permit.agentRequested ?? "—"}
                  sub={`${agent?.confidence ?? permit.confidence}% · gate-aligned`}
                  tone="violet"
                  dimmed={vetoed}
                />
                <ArrowRight className="mx-auto hidden h-5 w-5 text-white/25 sm:block" />
                <ArbitrationCell
                  label="Gate"
                  value={permit.constitutionSignal.replace("_", " ")}
                  sub={`${permit.gate.checksPassed}/${permit.gate.checksTotal} · ${permit.tier}`}
                  tone="cyan"
                />
                <ArrowRight className="mx-auto hidden h-5 w-5 text-white/25 sm:block" />
                <ArbitrationCell
                  label="Trade"
                  value={granted ? "GO" : "STOP"}
                  sub={permit.execute}
                  tone={granted ? "emerald" : "rose"}
                  highlight
                />
              </div>

              {(vetoed || !granted) && (permit as { blockReason?: string }).blockReason && (
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm",
                    vetoed
                      ? "border-amber-400/35 bg-amber-500/10 text-amber-100"
                      : "border-rose-400/35 bg-rose-500/10 text-rose-100",
                  )}
                >
                  <strong className="font-semibold">{vetoed ? "Override blocked." : "Why blocked."}</strong>{" "}
                  {(permit as { blockReason?: string }).blockReason}
                </div>
              )}

              {permit.gate.checks.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                    Gate checks · {sym}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {passedChecks.map((c) => (
                      <CheckRow key={c.id} label={c.label} pass />
                    ))}
                    {failedChecks.map((c) => (
                      <CheckRow key={c.id} label={c.label} pass={false} />
                    ))}
                  </div>
                  {failedChecks.length > 0 && (
                    <p className="mt-3 text-xs text-amber-100/90">
                      Failed: {failedChecks.map((c) => c.label.split("(")[0].trim()).join(" · ")}
                    </p>
                  )}
                </div>
              )}

              {payload?.skills && (
                <div className="grid gap-2 sm:grid-cols-3">
                  <SkillChip
                    label="Momentum"
                    signal={payload.skills.momentum.signal}
                    detail={`${payload.skills.momentum.checksPassed}/${payload.skills.momentum.checksTotal}`}
                  />
                  <SkillChip
                    label="Sentiment"
                    signal={payload.skills.sentiment.signal}
                    detail={payload.skills.sentiment.state.replace(/_/g, " ").toLowerCase()}
                    warn={payload.skills.sentiment.flagged}
                  />
                  <SkillChip
                    label="Regime"
                    signal={payload.skills.regime.signal}
                    detail={`${payload.skills.regime.regime} · ${payload.skills.regime.positioning.replace(/-/g, " ")}`}
                  />
                </div>
              )}

              <p className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-relaxed text-white/85">
                {permit.thesis}
              </p>

              {!isBenchmark && (
                <p className="text-xs text-white/45">
                  Benchmark demos use BNB or CAKE from the start screen — meme tickers use live desk data only.
                </p>
              )}
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
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        colors,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {label}
    </span>
  );
}

function CheckRow({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs",
        pass ? "border-emerald-400/20 bg-emerald-500/5 text-emerald-100/90" : "border-rose-400/25 bg-rose-500/5 text-rose-100/90",
      )}
    >
      {pass ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
      ) : (
        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
      )}
      <span className="leading-snug">{label}</span>
    </div>
  );
}

function SkillChip({
  label,
  signal,
  detail,
  warn,
}: {
  label: string;
  signal: string;
  detail: string;
  warn?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        warn ? "border-amber-400/30 bg-amber-500/10" : "border-white/10 bg-black/30",
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-white">{signal.replace("_", " ")}</p>
      <p className="text-[10px] text-white/50">{detail}</p>
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
