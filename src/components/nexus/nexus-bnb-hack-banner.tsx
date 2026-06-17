"use client";

import Link from "next/link";
import { ExternalLink, Shield, Sparkles } from "lucide-react";

/** Constitution Permit — live product strip (no scripted demo). */
export function NexusBnbHackBanner() {
  return (
    <div className="arc-glass-card arc-glass-card-nexus mb-4 overflow-hidden border-amber-400/25">
      <div className="arc-panel-stripe arc-panel-stripe-nexus" />
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-400/30">
            <Shield className="h-5 w-5 text-amber-200" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/80">
              Live agent risk gate
            </p>
            <p className="text-sm font-semibold text-white">Constitution Permit — agents ask, rules decide, trades obey</p>
            <p className="mt-0.5 text-xs leading-relaxed text-white/60">
              Market data → weighted gate checks → GRANT/DENY → buy blocked in NEXUS when vetoed.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-100">
            <Sparkles className="h-3 w-3" />
            Live data
          </span>
          <span className="rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70">
            Regime-aware gate
          </span>
          <Link
            href="#nexus-constitution-desk"
            className="inline-flex items-center gap-1 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/20"
          >
            Permit desk
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
