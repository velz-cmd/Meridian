"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Brain,
  Globe2,
  LineChart,
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
import { ArcLivePulseCard } from "@/components/landing/arc-live-pulse-card";
import { ArcPortalHero } from "@/components/landing/arc-portal-hero";
import { ArcDeployedBadge } from "@/components/landing/arc-deployed-badge";
import { GITHUB_SKILL_URL, isTrack2PriorityMode } from "@/lib/meridian-track2-mode";

export function ArcEcosystemHero() {
  const track2 = isTrack2PriorityMode();
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
            <p className="arc-caption text-cyan-300/85">MERIDIAN · CoinMarketCap Strategy Skill · BNB Chain</p>
          </div>

          <h1 className="arc-display text-left text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)] max-lg:text-[2rem] max-lg:leading-[1.08]">
            <span className="block">Don&apos;t deploy</span>
            <span className="arc-gradient-text block">until cleared.</span>
          </h1>

          <p className="mt-4 max-w-xl text-left text-[15px] leading-relaxed text-[var(--arc-text-muted)] sm:mt-5 sm:text-lg">
            {track2
              ? "CMC Strategy Skill · backtestable spec · market memory OS — live CoinMarketCap data into eight deterministic skills, auditable constitution, and 90-day replay proof."
              : "A BNB Hack Track 2 strategy skill: MERIDIAN turns live CoinMarketCap data into backtestable entry and exit rules, ranks BSC benchmarks, scores conviction, and blocks the wallet until the constitution passes."}
          </p>

          <ArcDeployedBadge />

          <ul className="arc-hero-bullets mt-5 max-w-lg space-y-2.5 text-left text-sm leading-relaxed text-white/55 sm:mt-6">
            <li>Live CoinMarketCap quotes, RSI, MACD, and Fear &amp; Greed feed eight deterministic skills</li>
            <li>Nine Constitution checks GRANT or DENY before any BSC Testnet swap</li>
            <li>90-day backtest proof — same rules in SKILL.md, CLI, API, and live desk</li>
          </ul>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/gate" className="w-full sm:w-auto">
              <Button variant="default" size="lg" className="arc-btn-pill min-h-[54px] w-full gap-2 px-8 sm:w-auto">
                <LineChart className="h-5 w-5" strokeWidth={1.5} />
                Open Strategy desk
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href={GITHUB_SKILL_URL} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="arc-btn-pill min-h-[54px] w-full gap-2 border-cyan-400/25 px-8 sm:w-auto">
                <Shield className="h-5 w-5" strokeWidth={1.5} />
                GitHub SKILL.md
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </a>
            {!track2 && (
              <Link href="/nexus" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="arc-btn-pill min-h-[54px] w-full gap-2 border-white/15 px-8 sm:w-auto">
                  <Zap className="h-5 w-5" strokeWidth={1.5} />
                  Constitution desk
                </Button>
              </Link>
            )}
          </div>
        </motion.div>
      </div>

      <ArcLivePulseCard />
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
          <div className="arc-panel-stripe arc-panel-stripe-home absolute inset-x-0 top-0" />
          <Badge className="border-cyan-400/30 bg-cyan-500/10 text-cyan-100">TRACK 2 · STRATEGY SKILL</Badge>
          <div className="relative mt-5 flex items-start gap-4">
            <ArcIcon3d icon={LineChart} theme="home" size="lg" />
            <div>
              <h2 className="text-2xl font-semibold text-white">CoinMarketCap Strategy desk</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/58">
                Live CMC data → eight skills → Constitution permit. Rank BNB · CAKE · FLOKI · XVS,
                run the 90-day backtest, and hand off to execution when cleared.
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
          <Badge variant="nexus">NEXUS</Badge>
          <div className="relative mt-5 flex items-start gap-4">
            <ArcIcon3d icon={Zap} theme="nexus" size="lg" />
            <div>
              <h2 className="text-2xl font-semibold text-white">Constitution desk</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/58">
                Where the skill executes — live feed, chart, agent reasoning, and permit-gated
                buy/sell on BSC Testnet.
              </p>
            </div>
          </div>
          <Link href="/nexus" className="relative mt-8 inline-block">
            <Button variant="nexus" className="arc-btn-pill gap-2">
              Open desk <ArrowUpRight className="h-4 w-4" />
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
              CoinMarketCap × BNB Chain · BNB Hack Track 2
              {process.env.NEXT_PUBLIC_MERIDIAN_BUILD &&
              process.env.NEXT_PUBLIC_MERIDIAN_BUILD !== "dev" ? (
                <span className="ml-1 font-mono text-white/30">
                  · {process.env.NEXT_PUBLIC_MERIDIAN_BUILD}
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-white/30">
              Also: NEXUS terminal · PRISM oracle · Arc Testnet (v0.7.1)
            </p>
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
