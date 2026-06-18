"use client";

import { type ComponentType } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Copy, Scale, ShieldCheck, ShieldBan } from "lucide-react";
import { buildGateExecutionUrl } from "@/lib/gate-nexus-bridge";
import { GateExecutionDesk } from "@/components/gate/gate-execution-desk";
import { usePositionRoute } from "@/hooks/use-position-route";
import { cn } from "@/lib/utils";

type Arbitration = {
  agent: { action: string; confidence: number };
  gate: { confidence: number; edge: number; signal: string; regime?: string };
  gap: number;
  vetoed: boolean;
  verdict: "GRANT" | "DENY";
  execute: string;
  permitId: string;
  narrative: string;
};

export function GatePermitArbitration({
  symbol,
  arbitration,
  granted,
  checks,
}: {
  symbol: string;
  arbitration: Arbitration | null;
  granted: boolean;
  priceUsd?: number;
  checks?: { id: string; pass: boolean; label: string }[];
}) {
  const { route, loading } = usePositionRoute(symbol, { intervalMs: 90_000 });

  if (!arbitration) return null;

  const agentPct = Math.min(100, arbitration.agent.confidence);
  const gatePct = Math.min(100, arbitration.gate.confidence);

  return (
    <section className="arc-glass-card arc-glass-card-nexus overflow-hidden rounded-2xl border border-white/10">
      <div className="arc-panel-stripe arc-panel-stripe-nexus" />
      <div className="relative space-y-5 p-5 sm:p-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/85">
            Permit arbitration · {symbol}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">Agent intent vs constitution</h2>
          <p className="mt-1 text-sm text-white/60">{arbitration.narrative}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
          <ArbCell
            icon={Bot}
            label="Agent"
            value={arbitration.agent.action}
            sub={`${arbitration.agent.confidence}% confidence`}
            bar={agentPct}
            barColor="violet"
          />
          <ArrowRight className="mx-auto hidden h-5 w-5 self-center text-white/25 sm:block" />
          <ArbCell
            icon={Scale}
            label="Gate"
            value={arbitration.gate.signal.replace("_", " ")}
            sub={`${arbitration.gate.confidence}% · edge +${arbitration.gate.edge}`}
            bar={gatePct}
            barColor="cyan"
            dimmed={arbitration.vetoed}
          />
          <ArrowRight className="mx-auto hidden h-5 w-5 self-center text-white/25 sm:block" />
          <ArbCell
            icon={granted ? ShieldCheck : ShieldBan}
            label="Permit"
            value={arbitration.verdict}
            sub={arbitration.execute === "LONG" ? "May size in" : "Do not trade"}
            highlight={granted ? "grant" : "deny"}
          />
        </div>

        {arbitration.vetoed && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            Confidence gap: agent leads gate by <strong>{Math.abs(arbitration.gap)} pts</strong> — constitution
            overrides upstream optimism.
          </motion.p>
        )}

        <PermitReceipt permitId={arbitration.permitId} verdict={arbitration.verdict} symbol={symbol} />

        {checks && checks.length > 0 && (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {checks.map((c) => (
              <p
                key={c.id}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-xs",
                  c.pass ? "bg-emerald-500/10 text-emerald-100/85" : "bg-rose-500/10 text-rose-100/85",
                )}
              >
                {c.pass ? "✓" : "✗"} {c.label}
              </p>
            ))}
          </div>
        )}

        <GateExecutionDesk
          symbol={symbol}
          route={route}
          loading={loading}
          permit={granted ? "GRANT" : "DENY"}
          permitId={arbitration.permitId}
          compact
        />

        <Link
          href={buildGateExecutionUrl({
            symbol,
            permit: granted ? "GRANT" : "DENY",
            permitId: arbitration.permitId,
            action: granted ? "buy" : "agent",
            direction: granted ? "LONG" : "FLAT",
            leverage: 2,
          })}
          className="inline-flex items-center gap-1 text-xs text-cyan-300/80 hover:text-cyan-200"
        >
          Open full NEXUS desk <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}

function ArbCell({
  icon: Icon,
  label,
  value,
  sub,
  bar,
  barColor,
  dimmed,
  highlight,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  bar?: number;
  barColor?: "violet" | "cyan";
  dimmed?: boolean;
  highlight?: "grant" | "deny";
}) {
  const border =
    highlight === "grant"
      ? "border-emerald-400/40 bg-emerald-500/10"
      : highlight === "deny"
        ? "border-rose-400/40 bg-rose-500/10"
        : "border-white/10 bg-black/30";

  return (
    <div className={cn("rounded-xl border p-3", border, dimmed && "opacity-50")}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-base font-bold text-white">{value}</p>
      <p className="text-[10px] text-white/45">{sub}</p>
      {bar != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={cn("h-full rounded-full", barColor === "violet" ? "bg-violet-400" : "bg-cyan-400")}
            style={{ width: `${bar}%` }}
          />
        </div>
      )}
    </div>
  );
}

function PermitReceipt({
  permitId,
  verdict,
  symbol,
}: {
  permitId: string;
  verdict: string;
  symbol: string;
}) {
  const receipt = JSON.stringify(
    { permitId, symbol, verdict, issuedAt: new Date().toISOString(), schema: "meridian-constitution-permit/v1" },
    null,
    2,
  );

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-white/40">Auditable permit receipt</p>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(receipt)}
          className="inline-flex items-center gap-1 text-[10px] text-white/50 hover:text-white"
        >
          <Copy className="h-3 w-3" /> Copy
        </button>
      </div>
      <code className="mt-2 block overflow-x-auto text-[10px] leading-relaxed text-emerald-200/80">{permitId}</code>
    </div>
  );
}
