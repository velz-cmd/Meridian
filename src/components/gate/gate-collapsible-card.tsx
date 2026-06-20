"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Progressive disclosure — executive summary visible, full depth on expand (Design V2). */
export function GateCollapsibleCard({
  title,
  question,
  summary,
  icon: Icon,
  accent = "border-white/[0.08]",
  defaultOpen = false,
  children,
}: {
  title: string;
  question?: string;
  summary: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      className={cn("gate-collapsible-card group rounded-2xl border bg-black/25 transition-colors", accent)}
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none p-5 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              {Icon && <Icon className="h-4 w-4 shrink-0 text-white/50" />}
              <h3 className="text-sm font-semibold tracking-tight text-white">{title}</h3>
            </div>
            {question && <p className="mt-1 text-xs text-white/45">{question}</p>}
            <div className="mt-3 text-sm leading-relaxed text-white/65">{summary}</div>
          </div>
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-white/35 transition duration-200 group-open:rotate-180" />
        </div>
      </summary>
      <div className="border-t border-white/[0.06] px-5 pb-5 pt-4">{children}</div>
    </details>
  );
}

export function GateStatPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="gate-stat-pill rounded-xl border border-white/[0.06] bg-black/30 px-4 py-3">
      <p className="text-[11px] text-white/40">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-white/40">{sub}</p>}
    </div>
  );
}
