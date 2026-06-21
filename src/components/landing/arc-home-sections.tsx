"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, LineChart, Radio, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { ArcLivePulseCard } from "@/components/landing/arc-live-pulse-card";
import { ArcPortalHero } from "@/components/landing/arc-portal-hero";
import {
  MERIDIAN_HOME_HEADLINE,
  MERIDIAN_HOME_SUBLINE,
  MERIDIAN_NAME,
  MERIDIAN_PROD_URL,
} from "@/lib/meridian-brand";
import { formatSpecHash, SKILL_VERSION } from "@/lib/meridian-math";
import { GATE_SKILL_REPO } from "@/lib/gate-constants";

export function ArcEcosystemHero() {
  return (
    <section className="arc-home-hero-shell relative mx-auto max-w-[1680px] px-4 pb-8 pt-2 sm:px-6 sm:pb-10 max-lg:pb-6">
      <div className="arc-home-hero-grid">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="arc-home-hero-visual"
        >
          <ArcPortalHero />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="arc-home-hero-copy"
        >
          <div className="mb-5 flex items-center gap-3 sm:justify-start">
            <ArcIcon3d icon={Sparkles} theme="home" size="sm" />
            <p className="arc-caption text-cyan-300/85">{MERIDIAN_NAME}</p>
          </div>

          <h1 className="arc-display text-left text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)] max-lg:text-[2rem] max-lg:leading-[1.08]">
            {MERIDIAN_HOME_HEADLINE}
          </h1>

          <p className="mt-4 max-w-xl text-left text-[15px] leading-relaxed text-[var(--arc-text-muted)] sm:mt-5 sm:text-lg">
            {MERIDIAN_HOME_SUBLINE}
          </p>

          <ul className="arc-hero-bullets mt-5 max-w-lg space-y-2.5 text-left text-sm leading-relaxed text-white/55 sm:mt-6">
            <li>Eight skills score live market data — momentum, regime, liquidity, and structure</li>
            <li>Constitution permit gates every trade before wallet settlement</li>
            <li>Historical replay uses the same rules as the live desk</li>
          </ul>

          {/* Proof + reproduce — same engine in UI, API, CLI, and replay. */}
          <div className="mt-6 max-w-lg rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] text-white/50">
              <span className="font-semibold uppercase tracking-[0.18em] text-cyan-300/75">Reproduce</span>
              <span className="text-cyan-200/70">{formatSpecHash()}</span>
              <span aria-hidden className="text-white/20">·</span>
              <span>skill v{SKILL_VERSION}</span>
            </p>
            <p className="mt-1.5 break-all font-mono text-[11px] text-white/65">
              curl {MERIDIAN_PROD_URL}/api/gate/evaluate?symbol=BNB
            </p>
            <a
              href={GATE_SKILL_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-block font-mono text-[10px] text-white/40 transition hover:text-cyan-300"
            >
              SKILL.md + STRATEGY_SPEC ↗
            </a>
          </div>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/gate" className="w-full sm:w-auto">
              <Button variant="default" size="lg" className="arc-btn-pill min-h-[54px] w-full gap-2 px-8 sm:w-auto">
                <LineChart className="h-5 w-5" strokeWidth={1.5} />
                Open Strategy desk
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/nexus" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="arc-btn-pill min-h-[54px] w-full gap-2 border-white/15 px-8 sm:w-auto">
                <Zap className="h-5 w-5" strokeWidth={1.5} />
                Open NEXUS
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      <ArcLivePulseCard />
    </section>
  );
}

export function ArcSystemsShowcase() {
  return (
    <section className="relative z-10 mx-auto max-w-[1680px] px-4 pb-16 sm:px-6 sm:pb-20 max-lg:pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div whileHover={{ y: -4 }} className="arc-panel relative overflow-hidden p-5 sm:p-6 lg:p-8">
          <div className="arc-panel-stripe arc-panel-stripe-home absolute inset-x-0 top-0" />
          <div className="relative mt-2 flex items-start gap-4">
            <ArcIcon3d icon={LineChart} theme="home" size="lg" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-300/75">Strategy</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">Strategy desk</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/58">
                Rank symbols, review permits, run historical replay, and open execution when rules clear.
              </p>
            </div>
          </div>
          <Link href="/gate" className="relative mt-8 inline-block">
            <Button variant="default" className="arc-btn-pill gap-2">
              Open Strategy desk <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="arc-panel relative overflow-hidden p-5 sm:p-6 lg:p-8">
          <div className="arc-panel-stripe arc-panel-stripe-nexus absolute inset-x-0 top-0 opacity-80" />
          <div className="relative mt-2 flex items-start gap-4">
            <ArcIcon3d icon={Zap} theme="nexus" size="lg" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300/75">NEXUS</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">Trade desk</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/58">
                Live chart, constitution checks, and permit-gated buy and sell on testnet.
              </p>
            </div>
          </div>
          <Link href="/nexus" className="relative mt-8 inline-block">
            <Button variant="nexus" className="arc-btn-pill gap-2">
              Open NEXUS <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

export function ArcHomeFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.08] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <ArcIcon3d icon={Sparkles} theme="home" size="md" />
          <div>
            <p className="font-mono text-sm font-semibold tracking-[0.18em] text-white">{MERIDIAN_NAME}</p>
            <p className="arc-caption mt-1">Strategy · NEXUS · PRISM</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-6 font-mono text-xs uppercase tracking-widest text-white/50">
          <Link href="/gate" className="transition hover:text-cyan-300">
            Strategy
          </Link>
          <Link href="/analytics" className="transition hover:text-cyan-300">
            Analytics
          </Link>
          <Link href="/nexus" className="transition hover:text-emerald-300">
            NEXUS
          </Link>
          <Link href="/prism" className="transition hover:text-amber-300">
            PRISM
          </Link>
          <a
            href="https://github.com/ibrahim0-cursor/cursor-arc-circle"
            className="transition hover:text-white"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
