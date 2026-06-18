"use client";

import { ExternalLink, FileText } from "lucide-react";
import {
  GITHUB_SKILL,
  STRATEGY_ENTRY_RULES,
  STRATEGY_EXIT_RULES,
  STRATEGY_POSITION_RULES,
} from "@/lib/gate-strategy-copy";

export function GateStrategySpec() {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/25">
      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300/85">
              Backtestable strategy spec
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Market data → trading rules</h2>
            <p className="mt-1 max-w-xl text-sm text-white/55">
              Quantopian-style: CMC quotes, technicals, and macro feed deterministic entry/exit logic. Same rules in
              SKILL.md, STRATEGY_SPEC.md, and the backtest engine.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-xs">
            <SpecLink href={`${GITHUB_SKILL}/SKILL.md`} label="SKILL.md" />
            <SpecLink href={`${GITHUB_SKILL}/STRATEGY_SPEC.md`} label="STRATEGY_SPEC.md" />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <RuleBlock title="Entry" rules={STRATEGY_ENTRY_RULES} />
          <RuleBlock title="Exit" rules={STRATEGY_EXIT_RULES} />
          <RuleBlock title="Position & backtest" rules={STRATEGY_POSITION_RULES} />
        </div>
      </div>
    </section>
  );
}

function RuleBlock({ title, rules }: { title: string; rules: readonly string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <ul className="mt-3 space-y-2">
        {rules.map((r) => (
          <li key={r} className="text-xs leading-relaxed text-white/60">
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpecLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-white/55 hover:text-white"
    >
      <FileText className="h-3.5 w-3.5" />
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
