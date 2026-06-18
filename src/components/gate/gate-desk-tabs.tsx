"use client";

import { BarChart3, BookOpen, LayoutDashboard, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";

export type GateDeskTab = "overview" | "technical" | "rules" | "replay";

const TABS: { id: GateDeskTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "technical", label: "Technical & reasoning", icon: BarChart3 },
  { id: "rules", label: "Rules & spec", icon: BookOpen },
  { id: "replay", label: "90-day replay", icon: LineChart },
];

export function GateDeskTabs({
  active,
  onChange,
}: {
  active: GateDeskTab;
  onChange: (tab: GateDeskTab) => void;
}) {
  return (
    <div className="gate-desk-tabs mb-3 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-1">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition",
            active === id
              ? "bg-cyan-500/15 text-cyan-100 shadow-[0_0_20px_-8px_rgba(34,211,238,0.5)]"
              : "text-white/45 hover:bg-white/5 hover:text-white/75",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
