"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Brain,
  Globe2,
  LineChart,
  Radar,
  Radio,
  ScanLine,
  Shield,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { ArcGlassPreview } from "@/components/landing/arc-glass-preview";
import { ArcLivePulseCard } from "@/components/landing/arc-live-pulse-card";
import { ArcPortalHero } from "@/components/landing/arc-portal-hero";
import { ArcDeployedBadge } from "@/components/landing/arc-deployed-badge";
import { MeridianHowItWorks } from "@/components/shared/meridian-how-it-works";

const metrics = [
  { icon: ScanLine, label: "Narrative layers", value: "06", sub: "Acceleration · flow · risk" },
  { icon: Radio, label: "Data planes", value: "12", sub: "On-chain · social · macro" },
  { icon: Activity, label: "Agent systems", value: "02", sub: "NEXUS · PRISM" },
];

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
            <p className="arc-caption text-violet-300/85">MERIDIAN · Agent Intelligence OS</p>
          </div>

          <h1 className="arc-display text-left text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)] max-lg:text-[2rem] max-lg:leading-[1.08]">
            <span className="block">Don&apos;t deploy</span>
            <span className="arc-gradient-text block">until cleared.</span>
          </h1>

          <p className="mt-4 max-w-xl text-left text-[15px] leading-relaxed text-[var(--arc-text-muted)] sm:mt-5 sm:text-lg">
            Agents chase momentum without a rule book. MERIDIAN watches live BSC benchmarks, scores
            conviction, routes capital to one name, and blocks the wallet until the constitution
            passes.
          </p>

          <ArcDeployedBadge />

          <ul className="arc-hero-bullets mt-5 max-w-lg space-y-2.5 text-left text-sm leading-relaxed text-white/55 sm:mt-6">
            <li>Four BSC leaders ranked every refresh — not the same BUY on every ticker</li>
            <li>Nine rule checks + three skills before any testnet swap is allowed</li>
            <li>One market row from router → feed → constitution desk → trade panel</li>
          </ul>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/gate" className="w-full sm:w-auto">
              <Button variant="default" size="lg" className="arc-btn-pill min-h-[54px] w-full gap-2 px-8 sm:w-auto">
                <LineChart className="h-5 w-5" strokeWidth={1.5} />
                Open momentum router
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/nexus" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="arc-btn-pill min-h-[54px] w-full gap-2 border-white/15 px-8 sm:w-auto">
                <Zap className="h-5 w-5" strokeWidth={1.5} />
                Constitution desk
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="relative z-10 mx-auto mt-10 max-w-[1680px] px-0 sm:px-0">
        <MeridianHowItWorks />
      </div>

      <ArcLivePulseCard />

      <div className="relative z-10 mt-6">
        <ArcGlassPreview />
      </div>

      <div className="relative z-10 mt-10 grid gap-3 sm:mt-14 sm:grid-cols-3 sm:gap-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 + i * 0.06 }}
            className="arc-panel relative overflow-hidden p-5 pt-6"
          >
            <div className="arc-panel-stripe arc-panel-stripe-home absolute inset-x-0 top-0" />
            <div className="flex gap-4">
              <ArcIcon3d icon={m.icon} theme="home" size="md" delay={i * 0.15} />
              <div className="text-left">
                <p className="arc-caption">{m.label}</p>
                <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-white">{m.value}</p>
                <p className="mt-1 text-xs text-white/48">{m.sub}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function ArcIntelligenceGrid() {
  const cells = [
    { icon: Radio, title: "Narrative velocity", copy: "Social Data X, Telegram, Discord, news acceleration." },
    { icon: LineChart, title: "Market pulse", copy: "Live pricing, wallet pressure, and liquidity flow." },
    { icon: Globe2, title: "Geopolitical pulse", copy: "Macro feeds and PRISM probability engine." },
    { icon: Brain, title: "AI reasoning", copy: "Explainable thesis — why the opportunity matters." },
    { icon: Wallet, title: "Smart money", copy: "Whale tracking, holder concentration, buy pressure." },
    { icon: Shield, title: "Risk matrix", copy: "Rug, liquidity, hype exhaustion — scored live." },
  ];

  return (
    <section className="relative z-10 mx-auto max-w-[1680px] px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="arc-caption mb-2 text-violet-300/70">Capabilities</p>
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl lg:text-3xl">
            Intelligence infrastructure
          </h2>
        </div>
        <ArcIcon3d icon={ScanLine} theme="home" size="md" />
      </div>
      <div className="arc-glass-card mt-6 divide-y divide-white/[0.06] overflow-hidden sm:mt-8">
        {cells.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
            className="arc-feature-row"
          >
            <ArcIcon3d
              icon={c.icon}
              theme={i % 3 === 0 ? "home" : i % 3 === 1 ? "nexus" : "prism"}
              size="md"
              delay={i * 0.12}
            />
            <div>
              <h3 className="text-base font-semibold text-white">{c.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/55">{c.copy}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function ArcSystemsShowcase() {
  return (
    <section className="relative z-10 mx-auto max-w-[1680px] px-4 pb-16 sm:px-6 sm:pb-20 max-lg:pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div whileHover={{ y: -4 }} className="arc-panel relative overflow-hidden p-5 sm:p-6 lg:p-8">
          <div className="arc-panel-stripe arc-panel-stripe-nexus absolute inset-x-0 top-0" />
          <Badge variant="nexus">NEXUS</Badge>
          <div className="relative mt-5 flex items-start gap-4">
            <ArcIcon3d icon={Zap} theme="nexus" size="lg" />
            <div>
              <h2 className="text-2xl font-semibold text-white">Constitution desk</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/58">
                Live feed, chart, agent reasoning, and permit-gated buy/sell on BSC Testnet.
              </p>
            </div>
          </div>
          <Link href="/nexus" className="relative mt-8 inline-block">
            <Button variant="nexus" className="arc-btn-pill gap-2">
              Open desk <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="arc-panel relative overflow-hidden p-5 sm:p-6 lg:p-8">
          <div className="arc-panel-stripe arc-panel-stripe-home absolute inset-x-0 top-0 opacity-80" />
          <Badge className="border-white/20 bg-white/10 text-white">GATE</Badge>
          <div className="relative mt-5 flex items-start gap-4">
            <ArcIcon3d icon={LineChart} theme="home" size="lg" />
            <div>
              <h2 className="text-2xl font-semibold text-white">Momentum router</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/58">
                Rank BNB · CAKE · FLOKI · XVS by rule checks — hand off to execution when cleared.
              </p>
            </div>
          </div>
          <Link href="/gate" className="relative mt-8 inline-block">
            <Button variant="default" className="arc-btn-pill gap-2">
              Open router <ArrowUpRight className="h-4 w-4" />
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
            <p className="font-mono text-sm font-semibold tracking-[0.18em] text-white">MERIDIAN</p>
            <p className="arc-caption mt-1">
              NEXUS + PRISM · Built for ARC Circle · Arc Testnet
              {process.env.NEXT_PUBLIC_MERIDIAN_BUILD &&
              process.env.NEXT_PUBLIC_MERIDIAN_BUILD !== "dev" ? (
                <span className="ml-1 font-mono text-white/30">
                  · {process.env.NEXT_PUBLIC_MERIDIAN_BUILD}
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-6 font-mono text-xs uppercase tracking-widest text-white/50">
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
