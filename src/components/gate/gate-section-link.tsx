"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Secondary navigation — text link with optional feature chips (Design V2). */
export function GateSectionLink({
  children,
  onClick,
  features,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  features?: string[];
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "gate-section-link inline-flex flex-wrap items-center gap-1.5 text-xs text-white/50 transition hover:text-violet-200",
        className,
      )}
    >
      <span className="inline-flex items-center gap-0.5">
        {children}
        <ChevronRight className="h-3.5 w-3.5 opacity-60" />
      </span>
      {features && features.length > 0 && (
        <span className="flex flex-wrap gap-0.5">
          {features.map((f) => (
            <span
              key={f}
              className="rounded border border-white/10 bg-white/[0.04] px-1 py-px text-[8px] font-medium text-white/40"
            >
              {f}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
