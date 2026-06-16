"use client";

import { Shield, ShieldAlert, ShieldCheck, Loader2, ArrowRight, Zap } from "lucide-react";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";
import { cn } from "@/lib/utils";
import type { ConvictionPayload } from "@/hooks/use-conviction-gate";
import type { AgentSignal } from "@/lib/storage";

const TIER_STYLE: Record<string, string> = {
  "a-plus": "border-emerald-400/50 bg-emerald-500/15 text-emerald-100",
  a: "border-cyan-400/45 bg-cyan-500/12 text-cyan-100",
  watch: "border-amber-400/40 bg-amber-500/10 text-amber-100",
  avoid: "border-rose-400/50 bg-rose-500/15 text-rose-100",
};

const SIGNAL_LABEL: Record<string, string> = {
  ENTER_LONG: "ENTER",
  HOLD: "HOLD",
  EXIT: "EXIT",
  AVOID: "AVOID",
};

function AgreementRing({ pct }: { pct: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color = pct >= 78 ? "#34d399" : pct >= 55 ? "#22d3ee" : "#fbbf24";
  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

function VetoFlow({
  agentAction,
  agentConf,
  finalAction,
  overridden,
}: {
  agentAction: string;
  agentConf: number;
  finalAction: string;
  overridden: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-3">
      <div className={cn("rounded-lg px-3 py-2", overridden ? "opacity-50 line-through" : "")}>
        <p className="text-[10px] uppercase tracking-wider text-white/45">Agent</p>
        <p className="text-sm font-bold text-violet-200">
          {agentAction} · {agentConf}%
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-white/30" />
      <div
        className={cn(
          "rounded-lg border px-3 py-2",
          overridden
            ? "border-amber-400/40 bg-amber-500/10"
            : "border-emerald-400/40 bg-emerald-500/10",
        )}
      >
        <p className="text-[10px] uppercase tracking-wider text-white/45">Constitution</p>
        <p className="text-sm font-bold text-white">
          {SIGNAL_LABEL[finalAction] ?? finalAction}
          {overridden && (
            <span className="ml-2 text-[10px] font-semibold uppercase text-amber-300">Vetoed</span>
          )}
        </p>
      </div>
    </div>
  );
}

export function NexusConvictionGate({
  data,
  loading,
  error,
  agent,
  symbol,
}: {
  data: ConvictionPayload | null;
  loading: boolean;
  error: string | null;
  agent?: AgentSignal;
  symbol: string;
}) {
  const gate = data?.gate;
  const veto = data?.veto;
  const bt = data?.backtest;
  const agreement = (gate?.agreement ?? 0) * 100;
  const overridden = veto?.overridden ?? false;
  const hint = loading
    ? "Running CMC conviction gate…"
    : gate
      ? `${gate.tier.toUpperCase()} · ${gate.checksPassed}/${gate.checksTotal} checks · ${data?.dataSource === "cmc+desk" ? "CMC live" : "Desk"}`
      : error ?? "Select token";

  const Icon = overridden ? ShieldAlert : gate?.tier === "avoid" ? ShieldAlert : ShieldCheck;

  return (
    <div id="nexus-conviction-gate">
      <NexusCollapsible
        label="Conviction Constitution"
        hint={hint}
        variant="reasoning"
        icon={Shield}
        defaultOpen={overridden || gate?.tier === "avoid"}
        showCollapseHint
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/90">
                <Zap className="h-3.5 w-3.5" />
                BNB Hack · CMC Strategy Skill
              </p>
              <p className="mt-1 text-sm text-white/70">
                Pre-trade veto layer — clamps agent BUY unless weighted gate clears. Same rules as{" "}
                <code className="rounded bg-white/5 px-1 text-[11px]">bnb-hack/</code> Skill.
              </p>
            </div>
            {gate && (
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                  TIER_STYLE[gate.tier] ?? TIER_STYLE.watch,
                )}
              >
                {gate.tier}
              </span>
            )}
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Loader2 className="h-4 w-4 animate-spin" />
              Fusing CoinMarketCap + desk intel for {symbol}…
            </div>
          )}

          {error && !loading && (
            <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {error}
            </p>
          )}

          {gate && !loading && (
            <>
              {agent && veto && (
                <VetoFlow
                  agentAction={agent.action}
                  agentConf={agent.confidence}
                  finalAction={veto.finalAction}
                  overridden={veto.overridden}
                />
              )}

              <div className="flex flex-wrap gap-4">
                <AgreementRing pct={agreement} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <MetricPill label="Gate signal" value={SIGNAL_LABEL[gate.signal] ?? gate.signal} accent />
                    <MetricPill label="Confidence" value={`${gate.confidence}`} />
                    <MetricPill label="Risk" value={`${gate.risk}`} />
                    {data?.cmcLive && <MetricPill label="CMC" value="Live" />}
                  </div>
                  <p className="text-sm leading-relaxed text-white/85">{gate.thesis}</p>
                  <p className="text-xs text-emerald-200/80">{gate.agentDirective}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                  Weighted gate checks
                </p>
                {gate.checks.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2"
                  >
                    <span className={cn("text-sm font-bold", c.pass ? "text-emerald-400" : "text-rose-400")}>
                      {c.pass ? "✓" : "✗"}
                    </span>
                    <span className="flex-1 text-xs text-white/75">{c.label}</span>
                    <span className="text-[10px] tabular-nums text-white/35">w{c.weight}</span>
                  </div>
                ))}
              </div>

              {bt && (
                <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.06] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-200/80">
                    Backtest · same rules · {symbol}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <MetricPill label="Return" value={`${bt.totalReturnPct}%`} accent />
                    <MetricPill label="Max DD" value={`${bt.maxDrawdownPct}%`} />
                    <MetricPill label="Win rate" value={`${bt.winRatePct}%`} />
                    <MetricPill label="Trips" value={`${bt.roundTrips}`} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </NexusCollapsible>
    </div>
  );
}

function MetricPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5">
      <p className="text-[9px] uppercase tracking-wider text-white/40">{label}</p>
      <p className={cn("text-sm font-semibold tabular-nums", accent ? "text-emerald-300" : "text-white/90")}>
        {value}
      </p>
    </div>
  );
}
