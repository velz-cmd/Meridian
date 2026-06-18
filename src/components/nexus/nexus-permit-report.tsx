"use client";

import { Loader2, Scale, ShieldCheck, ShieldX } from "lucide-react";
import { useConstitution } from "@/contexts/nexus-constitution-context";
import { cn } from "@/lib/utils";

export function NexusPermitReport({
  symbol,
  className,
  compact = false,
}: {
  symbol?: string;
  className?: string;
  compact?: boolean;
}) {
  const { payload, loading, error, canExecuteBuy } = useConstitution();
  const permit = payload?.permit;
  const sym = symbol?.replace(/^\$/, "").trim().toUpperCase() ?? permit?.permitId?.split("-")[0] ?? "—";
  const checks = permit?.gate.checks ?? [];
  const passed = permit?.gate.checksPassed ?? 0;
  const total = permit?.gate.checksTotal ?? (checks.length || 9);
  const scorePct = total > 0 ? Math.round((passed / total) * 100) : 0;
  const granted = permit?.status === "GRANT";
  const scanId = permit?.permitId?.slice(-8) ?? "pending";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-black/35",
        granted ? "border-emerald-400/30" : permit?.status === "DENY" ? "border-rose-400/30" : "border-white/10",
        compact ? "p-3" : "p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
            <Scale className="h-3.5 w-3.5" />
            Constitution report
          </p>
          <p className="mt-0.5 text-xs text-white/50">
            Scan #{scanId} · {sym}
            {payload?.generatedAt && !loading && (
              <span className="text-white/35"> · {Math.max(0, Date.now() - new Date(payload.generatedAt).getTime())}ms ago</span>
            )}
          </p>
        </div>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-violet-300" />
        ) : granted ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
            <ShieldCheck className="h-3 w-3" /> GRANT
          </span>
        ) : permit?.status === "DENY" ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-200">
            <ShieldX className="h-3 w-3" /> DENY
          </span>
        ) : (
          <span className="text-[10px] text-white/40">Awaiting</span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold tabular-nums",
            granted
              ? "border-emerald-400/50 text-emerald-200"
              : scorePct >= 50
                ? "border-amber-400/40 text-amber-200"
                : "border-rose-400/40 text-rose-200",
          )}
        >
          {loading ? "…" : `${passed}/${total}`}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            {loading
              ? "Running rule checks…"
              : granted
                ? "Cleared for wallet execution"
                : "Buy blocked until checks pass"}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/50">
            {error ??
              permit?.thesis ??
              (canExecuteBuy ? "Agent BUY aligned with constitution." : "Permit required before tBNB spend.")}
          </p>
        </div>
      </div>

      {checks.length > 0 && (
        <ul className="mt-3 max-h-36 space-y-1 overflow-y-auto text-[10px]">
          {checks.map((c) => (
            <li
              key={c.id}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border px-2 py-1",
                c.pass ? "border-emerald-400/20 bg-emerald-500/5 text-emerald-100/90" : "border-rose-400/15 bg-rose-500/5 text-rose-100/80",
              )}
            >
              <span className="truncate">{c.label}</span>
              {c.pass ? "✓" : "✗"}
            </li>
          ))}
        </ul>
      )}

      {payload?.skills?.composite && (
        <p className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-[10px] text-white/55">
          Composite · {payload.skills.composite.signal} · alignment{" "}
          {payload.skills.composite.alignmentScore ?? "—"}
          {payload.skills.composite.blockers?.length
            ? ` · blockers: ${payload.skills.composite.blockers.join(", ")}`
            : ""}
        </p>
      )}

      {payload?.counterfactual?.edge && (
        <p className="mt-2 text-[10px] text-cyan-200/80">
          Backtest edge · +{payload.counterfactual.edge.returnDeltaPct}% return vs naive · DD saved{" "}
          {payload.counterfactual.edge.drawdownSavedPct}%
        </p>
      )}
    </div>
  );
}
