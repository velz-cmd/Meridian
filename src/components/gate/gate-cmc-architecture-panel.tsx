"use client";

import { Database, GitBranch, Layers, Scale, Sparkles } from "lucide-react";
import {
  MERIDIAN_ARCHITECTURE_LAYERS,
  MERIDIAN_FEATURE_COVERAGE,
  summarizeArchitectureCoverage,
} from "@/lib/meridian-architecture";
import { MERIDIAN_GOLDEN_RULES } from "@/lib/meridian-philosophy";
import { cn } from "@/lib/utils";

const SOURCE_STYLE = {
  cmc: "border-cyan-400/25 bg-cyan-500/5 text-cyan-200",
  meridian: "border-violet-400/25 bg-violet-500/5 text-violet-200",
  hybrid: "border-amber-400/25 bg-amber-500/5 text-amber-200",
} as const;

const LAYER_ICONS = {
  "cmc-data": Database,
  "skill-layer": Layers,
  reasoning: Scale,
  memory: Sparkles,
  stress: GitBranch,
  output: Scale,
} as const;

export function GateCmcArchitecturePanel({ compact = false }: { compact?: boolean }) {
  const summary = summarizeArchitectureCoverage();

  return (
    <section className="rounded-2xl border border-cyan-400/15 bg-gradient-to-br from-cyan-950/20 to-black/40 overflow-hidden">
      <div className="border-b border-white/[0.06] px-4 py-4 sm:px-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/90">
          Track 2 architecture · CMC → MERIDIAN
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">
          {summary.tagline}
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-white/55">
          ~{summary.coveragePct}% of the intelligence stack is live — {summary.cmcSkillCount} CMC-backed skills feed
          MERIDIAN reasoning, memory, and stress layers. Not another indicator dashboard.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px]">
          <span className="rounded-full border border-cyan-400/30 px-2 py-0.5 text-cyan-200">
            {summary.featureLive}/{summary.featureTotal} features live
          </span>
          <span className="rounded-full border border-violet-400/30 px-2 py-0.5 text-violet-200">
            {summary.cmcSkillCount} CMC skills
          </span>
        </div>
      </div>

      <div className={cn("grid gap-3 p-4 sm:p-5", compact ? "lg:grid-cols-2" : "lg:grid-cols-3")}>
        {MERIDIAN_ARCHITECTURE_LAYERS.map((layer) => {
          const Icon = LAYER_ICONS[layer.id as keyof typeof LAYER_ICONS] ?? Layers;
          return (
            <div
              key={layer.id}
              className={cn("rounded-xl border p-3", SOURCE_STYLE[layer.source])}
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 opacity-80" />
                <p className="text-xs font-semibold">{layer.label}</p>
                <span className="ml-auto font-mono text-[8px] uppercase opacity-60">{layer.source}</span>
              </div>
              <p className="mb-2 text-[10px] leading-snug opacity-75">{layer.description}</p>
              <ul className="space-y-1">
                {layer.items.slice(0, compact ? 4 : 6).map((item) => (
                  <li key={item} className="text-[10px] opacity-90">
                    · {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {!compact && (
        <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Feature coverage map
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {MERIDIAN_FEATURE_COVERAGE.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-black/25 px-2.5 py-1.5 text-[10px]"
              >
                <span className="text-white/75">{f.name}</span>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 font-mono text-[8px] uppercase",
                    f.status === "live" && "bg-emerald-500/15 text-emerald-300",
                    f.status === "partial" && "bg-amber-500/15 text-amber-300",
                    f.status === "planned" && "bg-white/10 text-white/40",
                  )}
                >
                  {f.status}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-white/35">
            CMC cannot provide alone: smart-money wallets, orderbook depth, liquidations — MERIDIAN uses honest CMC
            proxies and labels sources on every skill.
          </p>
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Golden rules</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[10px] text-white/45">
              {MERIDIAN_GOLDEN_RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}
