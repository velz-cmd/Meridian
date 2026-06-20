"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Progressive disclosure — executive summary visible, full depth on expand. Nothing removed. */
export function GateCollapsibleCard({
  title,
  question,
  summary,
  icon: Icon,
  accent = "border-white/10",
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
      className={cn("group rounded-2xl border bg-black/30", accent)}
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4 shrink-0 text-violet-300" />}
              <h3 className="text-sm font-semibold text-white">{title}</h3>
            </div>
            {question && (
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-white/35">{question}</p>
            )}
            <div className="mt-2 text-sm text-white/70">{summary}</div>
          </div>
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-white/40 transition group-open:rotate-180" />
        </div>
      </summary>
      <div className="border-t border-white/[0.06] px-4 pb-4 pt-2">{children}</div>
    </details>
  );
}

export function GateStatPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2">
      <p className="text-[9px] uppercase tracking-wider text-white/35">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-white">{value}</p>
      {sub && <p className="text-[10px] text-white/45">{sub}</p>}
    </div>
  );
}
