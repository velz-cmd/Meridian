"use client";

import { useEffect, useState } from "react";
import { Shield, Sparkles, Loader2 } from "lucide-react";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { HACKATHON_DEMO_TOKENS, hydrateTokenFromMarket } from "@/lib/hackathon-demo";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { formatUsd } from "@/lib/utils";

export function NexusConstitutionStartPicks({
  feedTokens,
  onSelect,
  onRunDemo,
}: {
  feedTokens: TrendingMarketToken[];
  onSelect: (token: TrendingMarketToken) => void;
  onRunDemo?: () => void;
}) {
  const [hydrated, setHydrated] = useState<TrendingMarketToken[]>(HACKATHON_DEMO_TOKENS);
  const [loading, setLoading] = useState(true);

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
          Constitution Permit · live market gate
        </p>
        <h3 className="text-lg font-semibold text-white">Pick a token — agent proposes, constitution decides</h3>
        <p className="text-sm leading-relaxed text-white/55">
          Live market data feeds the gate. GRANT or DENY is enforced on the trade panel — not a slideshow.
        </p>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading live BSC prices…
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
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            const bnb = hydrated.find((t) => t.symbol === "BNB");
            if (bnb) onSelect(bnb);
            onRunDemo?.();
          }}
          className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-5 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/25 disabled:opacity-50"
        >
          Run Hackathon Demo
        </button>
        <p className="text-[10px] text-white/40">Auto-selects BNB · scrolls to constitution desk</p>
      </div>
      <p className="text-[10px] text-white/40">Or select any token from the live feed →</p>
    </div>
  );
}
