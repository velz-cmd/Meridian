"use client";

import { BarChart3, BookOpen, LayoutDashboard, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";

export type GateDeskTab = "overview" | "technical" | "rules" | "replay";

const TABS: { id: GateDeskTab; label: string; shortLabel: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", shortLabel: "Overview", icon: LayoutDashboard },
  { id: "technical", label: "Technical & reasoning", shortLabel: "Technical", icon: BarChart3 },
  { id: "rules", label: "Rules & spec", shortLabel: "Rules", icon: BookOpen },
  { id: "replay", label: "90-day replay", shortLabel: "Replay", icon: LineChart },
];

export function GateDeskTabs({
  active,
  onChange,
}: {
  active: GateDeskTab;
  onChange: (tab: GateDeskTab) => void;
}) {
  return (
    <div className="gate-desk-tabs arc-tab-bar arc-tab-bar--grid-4 mb-3 w-full">
      {TABS.map(({ id, label, shortLabel, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "arc-tab-item arc-tab-item--wrap-sm w-full",
            active === id && "arc-tab-item-active",
          )}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">{shortLabel}</span>
        </button>
      ))}
    </div>
  );
}
