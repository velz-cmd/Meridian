"use client";

import { BarChart3, BookOpen, Brain, LayoutDashboard, LineChart } from "lucide-react";
import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";
import {
  getGateDeskTabMeta,
  getTabFeatureChips,
  getTabSkillChips,
  type GateDeskTabTier,
} from "@/lib/gate-desk-tab-meta";
import { cn } from "@/lib/utils";

export type GateDeskTab = "overview" | "memory" | "technical" | "rules" | "replay";

const TAB_ORDER: GateDeskTab[] = ["overview", "memory", "technical", "rules", "replay"];

const TAB_ICONS = {
  overview: LayoutDashboard,
  memory: Brain,
  technical: BarChart3,
  rules: BookOpen,
  replay: LineChart,
} as const;

const TIER_STYLES: Record<
  GateDeskTabTier,
  { active: string; chip: string; chipLong: string; chipAvoid: string }
> = {
  primary: {
    active: "arc-tab-item-active arc-tab-item--primary",
    chip: "bg-violet-500/20 text-violet-100/90 border-violet-400/25",
    chipLong: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    chipAvoid: "bg-rose-500/15 text-rose-200/90 border-rose-400/25",
  },
  secondary: {
    active: "arc-tab-item-active",
    chip: "bg-white/[0.06] text-white/55 border-white/10",
    chipLong: "bg-emerald-500/15 text-emerald-200/90 border-emerald-400/25",
    chipAvoid: "bg-rose-500/10 text-rose-200/80 border-rose-400/20",
  },
  tertiary: {
    active: "arc-tab-item-active arc-tab-item--tertiary",
    chip: "bg-white/[0.04] text-white/45 border-white/[0.08]",
    chipLong: "bg-emerald-500/10 text-emerald-200/80 border-emerald-400/20",
    chipAvoid: "bg-rose-500/10 text-rose-200/70 border-rose-400/15",
  },
};

function TabChip({
  label,
  tone,
  tier,
}: {
  label: string;
  tone: "long" | "flat" | "avoid" | "neutral";
  tier: GateDeskTabTier;
}) {
  const styles = TIER_STYLES[tier];
  const chipClass =
    tone === "long" ? styles.chipLong : tone === "avoid" ? styles.chipAvoid : styles.chip;
  return (
    <span
      className={cn(
        "gate-tab-chip inline-flex max-w-[6.25rem] truncate rounded border px-1.5 py-0.5 text-[10px] font-medium leading-tight",
        chipClass,
      )}
      title={label}
    >
      {label}
    </span>
  );
}

export function GateDeskTabs({
  active,
  onChange,
  skills,
}: {
  active: GateDeskTab;
  onChange: (tab: GateDeskTab) => void;
  skills?: GateSkillsPayload | null;
}) {
  return (
    <div className="gate-desk-tabs arc-tab-bar arc-tab-bar--grid-5 mb-3 w-full">
      {TAB_ORDER.map((tabId, tabIndex) => {
        const meta = getGateDeskTabMeta(tabId);
        const Icon = TAB_ICONS[meta.id];
        const isActive = active === meta.id;
        const tierStyles = TIER_STYLES[meta.tier];
        const skillChips = getTabSkillChips(meta.id, skills);
        const featureChips = getTabFeatureChips(meta.id).slice(0, isActive ? 4 : 2);
        const tabNumber = tabIndex + 1;

        return (
          <button
            key={meta.id}
            type="button"
            onClick={() => onChange(tabId)}
            className={cn(
              "arc-tab-item arc-tab-item--wrap-sm gate-tab-item w-full flex-col items-stretch gap-1 py-2",
              isActive && tierStyles.active,
              meta.tier === "primary" && !isActive && "gate-tab-item--primary-idle",
            )}
            title={`${meta.question} · ${meta.features.join(" · ")}`}
          >
            <span className="flex w-full items-center justify-center gap-1.5">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{meta.label}</span>
              <span className="sm:hidden">{meta.shortLabel}</span>
              <span className="gate-tab-rank font-mono text-[8px] text-white/30">#{tabNumber}</span>
            </span>
            <span className="gate-tab-chips flex w-full flex-wrap justify-center gap-0.5 px-0.5">
              {meta.id === "technical" && skillChips.length > 0
                ? skillChips.map((c) => (
                    <TabChip key={c.label} label={c.label} tone={c.tone} tier={meta.tier} />
                  ))
                : featureChips.map((c) => (
                    <TabChip key={c.label} label={c.label} tone={c.tone} tier={meta.tier} />
                  ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
