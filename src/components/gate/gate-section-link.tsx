"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Secondary navigation — text link, not a button wall (Design V2). */
export function GateSectionLink({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "gate-section-link inline-flex items-center gap-0.5 text-xs text-white/50 transition hover:text-violet-200",
        className,
      )}
    >
      {children}
      <ChevronRight className="h-3.5 w-3.5 opacity-60" />
    </button>
  );
}
