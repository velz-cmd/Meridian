"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shield, Sparkles, Loader2, ArrowRight, ExternalLink } from "lucide-react";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { HACKATHON_DEMO_TOKENS, hydrateTokenFromMarket } from "@/lib/hackathon-demo";
import { useConstitutionCompare } from "@/hooks/use-constitution-compare";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { formatUsd } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function NexusConstitutionStartPicks({
  feedTokens,
  onSelect,
}: {
  feedTokens: TrendingMarketToken[];
  onSelect: (token: TrendingMarketToken) => void;
}) {
  const [hydrated, setHydrated] = useState<TrendingMarketToken[]>(HACKATHON_DEMO_TOKENS);
  const [loading, setLoading] = useState(true);
  const compare = useConstitutionCompare();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const rows = await Promise.all(
        HACKATHON_DEMO_TOKENS.map(async (demo) => {
          const live = feedTokens.find((t) => t.symbol.toUpperCase() === demo.symbol);
          if (live?.priceUsd && live.priceUsd > 0) {
            return { ...demo, ...live, agent: demo.agent };
          }
          const fromApi = await hydrateTokenFromMarket(demo.symbol);
          return fromApi ? { ...demo, ...fromApi, agent: demo.agent } : demo;
        }),
      );
      if (!cancelled) {
        setHydrated(rows);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [feedTokens]);

  return (
    <div className="arc-signal-panel arc-signal-panel-nexus flex flex-col items-center gap-5 px-4 py-10 text-center lg:py-14">
      <ArcIcon3d icon={Shield} theme="nexus" size="lg" />
      <div className="max-w-md space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/80">
          Risk gate
        </p>
        <h3 className="text-lg font-semibold text-white">Agents propose — the gate decides GO or STOP</h3>
        <p className="text-sm leading-relaxed text-white/55">
          Start with BNB or CAKE here for live trading + buy enforcement. For the BNB Hack submission (CMC-only,
          real backtest), use the standalone Gate product.
        </p>
        <Link
          href="/gate"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300/90 hover:text-emerald-200"
        >
          Open MERIDIAN Gate (Track 2 demo)
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading live prices…
        </div>
      ) : (
        <div className="flex w-full max-w-sm flex-col gap-2 sm:max-w-lg sm:flex-row sm:justify-center">
          {hydrated.map((token) => (
            <button
              key={token.symbol}
              type="button"
              onClick={() => onSelect(token)}
              className="arc-glass-card arc-glass-card-nexus flex flex-1 items-center gap-3 rounded-xl border border-amber-400/25 px-4 py-3 text-left transition hover:border-amber-400/45 hover:bg-amber-500/10"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-400/30">
                <Sparkles className="h-4 w-4 text-amber-200" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{token.symbol}</p>
                <p className="text-[10px] text-white/50">
                  {token.priceUsd > 0 ? formatUsd(token.priceUsd) : "—"} · Agent {token.agent?.action}{" "}
                  {token.agent?.confidence}%
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="w-full max-w-md rounded-xl border border-white/10 bg-black/25 p-4 text-left">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-white/70">Benchmark pair · BNB vs CAKE</p>
          <button
            type="button"
            disabled={compare.loading}
            onClick={() => void compare.compare(["BNB", "CAKE"])}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
          >
            {compare.loading ? "Running…" : "Run compare"}
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {compare.error && <p className="mt-2 text-xs text-rose-200">{compare.error}</p>}
        {Object.keys(compare.results).length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(["BNB", "CAKE"] as const).map((sym) => {
              const row = compare.results[sym];
              if (!row?.permit) return null;
              return (
                <div
                  key={sym}
                  className={cn(
                    "rounded-lg border px-3 py-2",
                    row.permit.status === "GRANT"
                      ? "border-emerald-400/30 bg-emerald-500/10"
                      : "border-rose-400/30 bg-rose-500/10",
                  )}
                >
                  <p className="text-sm font-bold text-white">{sym}</p>
                  <p className="text-xs text-white/60">
                    {row.permit.status} · {row.permit.gate?.regime ?? "—"} · {row.permit.gate.checksPassed}/
                    {row.permit.gate.checksTotal}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-[10px] text-white/40">Only shown here — not on every token you open.</p>
      </div>

      <p className="text-[10px] text-white/40">Or pick any token from the live feed →</p>
    </div>
  );
}
