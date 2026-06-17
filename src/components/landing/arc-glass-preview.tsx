"use client";

import { motion } from "framer-motion";
import { ArrowRightLeft, LineChart, TrendingUp, Wallet } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";

/** Glass dashboard preview — center-aligned cards */
export function ArcGlassPreview() {
  return (
    <div className="arc-glass-preview relative mx-auto mt-10 w-full max-w-5xl px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="grid gap-5 md:grid-cols-3 md:items-stretch"
      >
        <div className="arc-glass-card arc-glass-preview-card flex flex-col items-center p-5 text-center">
          <div className="mb-4 flex flex-col items-center gap-2">
            <ArcIcon3d icon={LineChart} theme="home" size="sm" />
            <span className="text-xs font-medium tracking-wide text-white/55">Market pulse</span>
          </div>
          <div className="w-full max-w-[200px] space-y-2.5">
            {[
              { sym: "NEXUS", pct: "+4.2%", hot: true },
              { sym: "ARC", pct: "+1.1%", hot: false },
              { sym: "BASE", pct: "+1.1%", hot: false },
            ].map((row) => (
              <div key={row.sym} className="flex items-center justify-between gap-6 font-mono text-xs">
                <span className="text-white/85">{row.sym}</span>
                <span className={row.hot ? "text-emerald-400" : "text-white/45"}>{row.pct}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="arc-glass-card arc-glass-card-hero arc-glass-preview-card flex flex-col items-center p-6 text-center">
          <div className="mb-4 flex w-full max-w-[260px] items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ArcIcon3d icon={Wallet} theme="home" size="sm" />
              <span className="text-sm font-medium text-white">Intelligence vault</span>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              LIVE
            </span>
          </div>
          <p className="font-mono text-3xl font-semibold tracking-tight text-white">$24,891</p>
          <p className="mt-1.5 text-xs text-white/45">Demo portfolio · live risk gate</p>
          <div className="mt-5 h-16 w-full max-w-[260px] overflow-hidden rounded-xl bg-gradient-to-t from-violet-500/20 to-transparent">
            <svg viewBox="0 0 200 48" className="h-full w-full" preserveAspectRatio="none">
              <motion.path
                d="M0,40 Q50,8 100,28 T200,12"
                fill="none"
                stroke="url(#arcLine)"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2 }}
              />
              <defs>
                <linearGradient id="arcLine" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <div className="arc-glass-card arc-glass-preview-card flex flex-col items-center p-5 text-center">
          <div className="mb-4 flex flex-col items-center gap-2">
            <ArcIcon3d icon={ArrowRightLeft} theme="nexus" size="sm" />
            <span className="text-xs font-medium tracking-wide text-white/55">Agent swap</span>
          </div>
          <div className="w-full max-w-[220px] space-y-2">
            <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-left">
              <p className="text-center text-[10px] uppercase tracking-wider text-white/40">From</p>
              <p className="mt-1 text-center font-mono text-sm text-white">2.5 ETH</p>
            </div>
            <div className="flex justify-center py-1">
              <ArcIcon3d icon={TrendingUp} theme="home" size="sm" className="!h-8 !w-8" />
            </div>
            <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-left">
              <p className="text-center text-[10px] uppercase tracking-wider text-white/40">Receive</p>
              <p className="mt-1 text-center font-mono text-sm text-white">12,400 ARC</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
