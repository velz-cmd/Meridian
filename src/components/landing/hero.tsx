"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, LineChart, Shield, Sparkles, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function LandingHero() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6 sm:pb-20 sm:pt-14">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl"
      >
        <Badge variant="prism" className="mb-4">
          Autonomous Market Intelligence
        </Badge>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
          MERIDIAN
          <span className="mt-2 block bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-300 bg-clip-text text-2xl text-transparent sm:text-4xl md:text-5xl">
            Constitution Permit · NEXUS trades.
          </span>
        </h1>
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/45">Live markets · agent risk gate · mobile trading desk</p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/80 sm:mt-5 sm:text-lg">
          Mobile-friendly agent suite: <strong className="text-white">NEXUS</strong> agents request BUY — the{" "}
          <strong className="text-white">Constitution</strong> GRANTs or DENYs with market-backed rules and counterfactual
          backtest proof. <strong className="text-white">PRISM</strong> turns live macro news into probabilities.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/prism" className="w-full sm:w-auto">
            <Button variant="prism" size="lg" className="min-h-[48px] w-full text-base sm:w-auto">
              Open PRISM <Sparkles className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/nexus" className="w-full sm:w-auto">
            <Button variant="nexus" size="lg" className="min-h-[48px] w-full text-base sm:w-auto">
              Open NEXUS <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </motion.div>

      <div className="mt-12 grid gap-4 sm:grid-cols-3 sm:gap-6">
        {[
          {
            icon: Sparkles,
            title: "PRISM oracle",
            copy: "GDELT + news + AI forecasts with Kelly sizing — built for mobile.",
          },
          {
            icon: LineChart,
            title: "Real market data",
            copy: "Live prices, macro context, and wallet intelligence — presented as decisions, not plumbing.",
          },
          {
            icon: Shield,
            title: "Permit-gated trades",
            copy: "Connect wallet, trade with % buttons, and block entries when the risk gate DENYs.",
          },
        ].map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
          >
            <Card className="h-full">
              <CardContent className="p-5 sm:pt-6">
                <item.icon className="mb-3 h-6 w-6 text-violet-300" />
                <h3 className="text-base font-semibold text-white sm:text-lg">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{item.copy}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function ProductShowcase() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-24">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Card className="order-1 overflow-hidden border-violet-400/25 bg-gradient-to-br from-violet-500/[0.12] to-transparent lg:order-1">
          <CardContent className="p-6 sm:p-8">
            <Badge variant="prism">Featured · PRISM</Badge>
            <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">Macro & Geopolitical Oracle</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
              Pick Fed, oil, or custom events. See live BTC/ETH macro context, GDELT crisis signals, and calibrated
              probabilities with shareable reasoning.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-white/75">
              <li className="flex items-center gap-2">
                <Waves className="h-4 w-4 shrink-0 text-violet-300" /> CoinGecko + GDELT (free APIs)
              </li>
              <li className="flex items-center gap-2">
                <Waves className="h-4 w-4 shrink-0 text-violet-300" /> OpenAI / Claude forecasts
              </li>
              <li className="flex items-center gap-2">
                <Waves className="h-4 w-4 shrink-0 text-violet-300" /> Mobile-first forecast UI
              </li>
            </ul>
            <Link href="/prism" className="mt-6 block sm:mt-8">
              <Button variant="prism" className="min-h-[48px] w-full sm:w-auto">
                Launch PRISM
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="order-2 overflow-hidden border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.08] to-transparent">
          <CardContent className="p-6 sm:p-8">
            <Badge variant="nexus">NEXUS</Badge>
            <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">Trading Agent</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
              Live feed, agent verdict, constitution permit, and wallet-signed tBNB trades on BSC Testnet.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-white/75">
              <li className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 shrink-0 text-cyan-300" /> Live market feed
              </li>
              <li className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 shrink-0 text-cyan-300" /> PancakeSwap buy/sell · tBNB
              </li>
              <li className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 shrink-0 text-cyan-300" /> Constitution gate + on-chain portfolio
              </li>
            </ul>
            <Link href="/nexus" className="mt-6 block sm:mt-8">
              <Button variant="nexus" className="min-h-[48px] w-full sm:w-auto">
                Launch NEXUS
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
