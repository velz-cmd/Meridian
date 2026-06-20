"use client";

import { ChevronDown } from "lucide-react";
import { GateSectionHead } from "@/components/gate/gate-section-head";
import { cn } from "@/lib/utils";

/** Progressive disclosure — executive summary visible, full depth on expand (Design V2). */
export function GateCollapsibleCard({
  title,
  question,
  kicker,
  summary,
  icon,
  accent = "border-white/[0.08]",
  defaultOpen = false,
  children,
}: {
  title: string;
  question?: string;
  kicker?: string;
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
      <summary className="cursor-pointer list-none p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <GateSectionHead title={title} question={question} kicker={kicker} icon={icon} />
            <div className="gate-section-summary mt-3 pl-[calc(0.75rem+3px)]">{summary}</div>
          </div>
          <ChevronDown className="mt-2 h-4 w-4 shrink-0 text-white/50 transition duration-200 group-open:rotate-180" />
        </div>
      </summary>
      <div className="gate-section-expanded border-t border-white/[0.08] px-5 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
        {children}
      </div>
    </details>
  );
}

export function GateStatPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="gate-stat-pill rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3">
      <p className="gate-stat-label">{label}</p>
      <p className="gate-stat-value mt-1">{value}</p>
      {sub && <p className="gate-stat-sub mt-0.5">{sub}</p>}
    </div>
  );
}
