"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, LineChart, Scale, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type GateStatus = {
  cmc?: { live?: boolean };
  symbols?: string[];
};

const PILLARS = [
  {
    key: "cmc",
    title: "CMC_INGEST",
    body: "Quotes, RSI, MACD, Fear & Greed — live CoinMarketCap feed into the strategy engine.",
    tags: ["Immutable rules", "Deterministic", "Skill-backed"],
  },
  {
    key: "rules",
    title: "CONSTITUTION_RULES",
    body: "Nine checks per symbol · momentum · sentiment · regime — GRANT or DENY before wallet.",
    tags: ["Permit gate", "Agent override blocked", "Auditable"],
  },
  {
    key: "proof",
    title: "BACKTEST_PROOF",
    body: "90-day replay vs naive agent — same rules in CLI, API, and live desk. Not a markdown-only skill.",
    tags: ["Quantopian-style", "Reproducible", "On-chain desk"],
  },
] as const;

const PHASES = [
  { n: "01", label: "WATCH", sub: "Live feed sync" },
  { n: "02", label: "SCORE", sub: "9 rule checks" },
  { n: "03", label: "ROUTE", sub: "Capital rank" },
  { n: "04", label: "PERMIT", sub: "Wallet gate" },
] as const;

export function MeridianSkillArchitectureHero({ className }: { className?: string }) {
  const [status, setStatus] = useState<GateStatus | null>(null);
  const [boot, setBoot] = useState("SYNC");

  useEffect(() => {
    void fetch("/api/gate/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        setStatus(j);
        setBoot(j?.cmc?.live ? "OK" : "CACHE");
      })
      .catch(() => setBoot("CACHE"));
  }, []);

  const live = status?.cmc?.live ?? false;

  return (
    <section
      className={cn(
        "relative z-10 mx-auto max-w-[1680px] px-4 py-10 sm:px-6 sm:py-14",
        className,
      )}
    >
      <div className="rounded-3xl border border-white/[0.08] bg-black/35 p-5 sm:p-8">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-violet-300/90 sm:text-xs">
          // CMC DATA → STRATEGY RULES → PERMIT → EXECUTION
        </p>
        <p className="mt-2 font-mono text-sm text-emerald-300/90 sm:text-base">
          &gt; meridian-momentum-constitution… [{boot}]
          {live && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              CMC LIVE
            </span>
          )}
        </p>

        <h2 className="mt-4 max-w-3xl text-2xl font-semibold leading-tight text-white sm:text-3xl">
          A CoinMarketCap strategy skill with a{" "}
          <span className="text-white/55">production execution harness.</span>
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
          Track 2 asks for a backtestable skill — we ship SKILL.md plus a live router, constitution
          desk, and PancakeSwap on BSC Testnet. Same rules everywhere; the app proves the skill works.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <div
              key={p.key}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-3 py-3 sm:px-4 sm:py-4"
            >
              <p className="font-mono text-[10px] font-bold tracking-wider text-cyan-300/85">{p.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-white/60">{p.body}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] text-white/45"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
            // THE ARCHITECTURE OF EXECUTION
          </p>
          <p className="mt-1 text-xs text-white/45">DECENTRALIZED STRATEGY LIFECYCLE</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            {PHASES.map((ph, i) => (
              <div key={ph.n} className="flex min-w-0 flex-1 items-stretch gap-2">
                <div className="min-w-0 flex-1 rounded-xl border border-violet-400/25 bg-violet-500/[0.06] px-3 py-2.5">
                  <p className="font-mono text-[9px] text-violet-300/70">PHASE_{ph.n}</p>
                  <p className="font-mono text-sm font-bold text-white">{ph.label}</p>
                  <p className="text-[10px] text-white/45">{ph.sub}</p>
                </div>
                {i < PHASES.length - 1 && (
                  <span className="hidden self-center text-white/25 sm:inline" aria-hidden>
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/gate"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black hover:bg-white/90"
          >
            <LineChart className="h-4 w-4" />
            Open live skill demo
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/nexus"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white hover:bg-white/10"
          >
            <Scale className="h-4 w-4" />
            Constitution desk
          </Link>
          <a
            href="https://github.com/ibrahim0-cursor/cursor-arc-circle/tree/main/bnb-hack/skills/nexus-momentum-gate"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-5 text-sm font-semibold text-violet-100 hover:bg-violet-500/20"
          >
            <BookOpen className="h-4 w-4" />
            SKILL.md
            <Sparkles className="h-3.5 w-3.5 opacity-70" />
          </a>
        </div>
      </div>
    </section>
  );
}
