"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { LineChart, Radio, Shield, Sparkles, Zap } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";

/** Workspace intro — strategy engine + execution terminal */
export function NexusPremiumHero({ stableCount }: { stableCount: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="arc-glass-card arc-glass-card-nexus arc-border-trace nexus-workspace-intro relative mb-4 overflow-hidden p-4 pt-5 sm:p-5 sm:pt-6"
    >
      <div className="arc-panel-stripe arc-panel-stripe-nexus absolute inset-x-0 top-0 h-1" />
      <div className="nexus-premium-hero-glow pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <ArcIcon3d icon={Zap} theme="nexus" size="md" delay={0} />
          <div className="min-w-0">
            <p className="arc-caption text-violet-300/85">MERIDIAN · Strategy → Execution</p>
            <h2 className="nexus-workspace-title mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Constitution <span className="arc-gradient-text">command terminal</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--arc-text-muted)]">
              Live CMC benchmarks (BNB · CAKE · FLOKI · XVS) feed the capital router above — permit-gated trades on
              BSC testnet. {stableCount} movers in scan; strategy symbols always sync with the gate engine.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          {[
            { icon: Shield, label: "Router", sub: "4-benchmark rank", href: "/gate" },
            { icon: Radio, label: "Feed", sub: "Gate-aligned", href: undefined },
            { icon: LineChart, label: "Backtest", sub: "90d proof", href: "/gate" },
          ].map((m, i) => {
            const inner = (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.06 }}
                className="arc-glass-card flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 transition hover:border-white/20"
              >
                <ArcIcon3d icon={m.icon} theme="nexus" size="sm" delay={i * 0.2} />
                <div>
                  <p className="text-[11px] font-semibold text-white">{m.label}</p>
                  <p className="text-[10px] text-white/45">{m.sub}</p>
                </div>
              </motion.div>
            );
            return m.href ? (
              <Link key={m.label} href={m.href}>
                {inner}
              </Link>
            ) : (
              <div key={m.label}>{inner}</div>
            );
          })}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="arc-glass-card flex items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2"
          >
            <ArcIcon3d icon={Sparkles} theme="nexus" size="sm" delay={0.4} />
            <div>
              <p className="text-[11px] font-semibold text-white">Alpha</p>
              <p className="text-[10px] text-white/45">Deep scan</p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
