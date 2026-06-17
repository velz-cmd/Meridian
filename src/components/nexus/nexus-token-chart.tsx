"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Loader2, Maximize2 } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { ArcPanel } from "@/components/ui/arc-panel";
import { NexusChartFullscreen } from "@/components/nexus/nexus-chart-fullscreen";
import { NEXUS_TRADE_ICONS } from "@/lib/nexus-trade-icons";
import { dexChartEmbedUrl } from "@/lib/dexscreener";
import { cn } from "@/lib/utils";

const PAIR_CACHE_KEY = "nexus-pair-v1";

function readPairCache(chainId: string, tokenAddress: string): { pairAddress: string; url?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${PAIR_CACHE_KEY}:${chainId}:${tokenAddress.toLowerCase()}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; pairAddress: string; url?: string };
    if (Date.now() - parsed.at > 300_000 || !parsed.pairAddress) return null;
    return { pairAddress: parsed.pairAddress, url: parsed.url };
  } catch {
    return null;
  }
}

function writePairCache(chainId: string, tokenAddress: string, pairAddress: string, url?: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      `${PAIR_CACHE_KEY}:${chainId}:${tokenAddress.toLowerCase()}`,
      JSON.stringify({ at: Date.now(), pairAddress, url }),
    );
  } catch {
    /* quota */
  }
}

export function useNexusChartPair({
  chainId,
  pairAddress,
  tokenAddress,
}: {
  chainId?: string;
  pairAddress?: string;
  tokenAddress?: string;
}) {
  const initialPair =
    pairAddress ||
    (chainId && tokenAddress ? readPairCache(chainId, tokenAddress)?.pairAddress : "") ||
    "";

  const [resolvedPair, setResolvedPair] = useState(initialPair);
  const [dexUrl, setDexUrl] = useState<string | null>(() =>
    chainId && tokenAddress ? (readPairCache(chainId, tokenAddress)?.url ?? null) : null,
  );
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (pairAddress) {
      setResolvedPair(pairAddress);
      return;
    }
    if (chainId && tokenAddress) {
      const hit = readPairCache(chainId, tokenAddress);
      if (hit?.pairAddress) {
        setResolvedPair(hit.pairAddress);
        if (hit.url) setDexUrl(hit.url);
      }
    }
  }, [pairAddress, chainId, tokenAddress]);

  useEffect(() => {
    if (!chainId || !tokenAddress || resolvedPair) return;
    let cancelled = false;
    setResolving(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    fetch(
      `/api/nexus/pair?chainId=${encodeURIComponent(chainId)}&address=${encodeURIComponent(tokenAddress)}`,
      { cache: "force-cache", signal: controller.signal },
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.pairAddress) {
          setResolvedPair(data.pairAddress);
          writePairCache(chainId, tokenAddress, data.pairAddress, data.url);
        }
        if (data.url) setDexUrl(data.url);
      })
      .catch(() => {
        if (!cancelled) setResolvedPair("");
      })
      .finally(() => {
        clearTimeout(timer);
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [chainId, tokenAddress, resolvedPair]);

  return { resolvedPair, dexUrl, resolving };
}

export function NexusTokenChart({
  chainId,
  pairAddress,
  tokenAddress,
  symbol,
  compact = false,
  fullscreenOpen,
  onFullscreenChange,
  showExpand = true,
}: {
  chainId?: string;
  pairAddress?: string;
  tokenAddress?: string;
  symbol?: string;
  compact?: boolean;
  fullscreenOpen?: boolean;
  onFullscreenChange?: (open: boolean) => void;
  showExpand?: boolean;
}) {
  const [internalFs, setInternalFs] = useState(false);
  const fsOpen = fullscreenOpen ?? internalFs;
  const setFsOpen = onFullscreenChange ?? setInternalFs;

  const { resolvedPair, dexUrl, resolving } = useNexusChartPair({
    chainId,
    pairAddress,
    tokenAddress,
  });

  if (!chainId || (!resolvedPair && !tokenAddress)) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="arc-signal-panel arc-signal-panel-nexus flex h-[200px] items-center justify-center p-6 text-center sm:h-[240px]"
      >
        <div>
          <ArcIcon3d icon={NEXUS_TRADE_ICONS.chart} theme="nexus" size="md" className="mx-auto mb-3" />
          <p className="text-sm text-[var(--arc-text-muted)]">Select a token from the feed to load chart</p>
        </div>
      </motion.div>
    );
  }

  if (!resolvedPair) {
    return (
      <div className="arc-signal-panel arc-signal-panel-nexus flex h-[200px] flex-col items-center justify-center gap-3 p-6 sm:h-[240px]">
        {resolving ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
            <p className="text-sm text-white/60">Resolving market pair for {symbol ?? "token"}…</p>
          </>
        ) : (
          <>
            <ArcIcon3d icon={NEXUS_TRADE_ICONS.chart} theme="nexus" size="sm" />
            <p className="text-center text-sm text-white/60">No chart pair found for this token.</p>
            {dexUrl && (
              <a
                href={dexUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-cyan-200 underline"
              >
                Open market chart <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </>
        )}
      </div>
    );
  }

  const headerAction = (
    <div className="flex items-center gap-2">
      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
        Live
      </span>
      {showExpand && (
        <button
          type="button"
          onClick={() => setFsOpen(true)}
          className="arc-glass-interactive inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/15 px-2.5 py-1 text-[10px] font-bold text-violet-100 transition hover:border-violet-300/50"
          aria-label="Open chart fullscreen"
          title="Fullscreen chart"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Fullscreen</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      <motion.div key={`${chainId}:${resolvedPair}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <ArcPanel
          theme="nexus"
          title={symbol ?? "Live chart"}
          icon={NEXUS_TRADE_ICONS.chart}
          action={headerAction}
          className="nexus-chart-panel arc-border-trace overflow-hidden [&_.arc-panel-body]:!p-0"
        >
          <div
            className={cn(
              "nexus-chart-embed-frame relative overflow-hidden",
              compact
                ? "h-[180px] sm:h-[200px] lg:h-[210px] lg:max-h-[220px]"
                : "h-[min(42dvh,320px)] sm:h-[280px] lg:h-[min(32vh,300px)] lg:max-h-[300px]",
            )}
          >
            <iframe
              title={`${symbol ?? "Token"} chart`}
              src={dexChartEmbedUrl(chainId, resolvedPair)}
              className="nexus-chart-iframe h-full w-full border-0"
              allow="clipboard-write"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-8 items-center justify-center border-t border-white/10 bg-[#050508]/95 text-[10px] font-medium uppercase tracking-[0.2em] text-white/35 backdrop-blur">
              Market chart
            </div>
          </div>
        </ArcPanel>
      </motion.div>
      <NexusChartFullscreen
        open={fsOpen}
        onClose={() => setFsOpen(false)}
        chainId={chainId}
        pairAddress={resolvedPair}
        symbol={symbol}
        dexUrl={dexUrl}
      />
    </>
  );
}
