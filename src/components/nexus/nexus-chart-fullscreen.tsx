"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Minimize2 } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { NEXUS_TRADE_ICONS } from "@/lib/nexus-trade-icons";
import { dexChartEmbedUrl } from "@/lib/dexscreener";

export function NexusChartFullscreen({
  open,
  onClose,
  chainId,
  pairAddress,
  symbol,
  dexUrl,
}: {
  open: boolean;
  onClose: () => void;
  chainId: string;
  pairAddress: string;
  symbol?: string;
  dexUrl?: string | null;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && pairAddress && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${symbol ?? "Token"} chart fullscreen`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="nexus-chart-fullscreen fixed inset-0 z-[220] flex flex-col bg-[#04060c]/96 backdrop-blur-xl"
        >
          <div className="arc-panel-stripe arc-panel-stripe-nexus h-1 w-full shrink-0" />
          <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
            <ArcIcon3d icon={NEXUS_TRADE_ICONS.chart} theme="nexus" size="sm" />
            <div className="min-w-0 flex-1">
              <p className="arc-caption text-violet-300/85">Chart view</p>
              <h2 className="truncate text-lg font-semibold text-white">{symbol ?? "Live chart"}</h2>
            </div>
            <span className="hidden rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 sm:inline">
              Live market
            </span>
            {dexUrl && (
              <a
                href={dexUrl}
                target="_blank"
                rel="noreferrer"
                className="arc-glass-interactive hidden items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-cyan-100 sm:inline-flex"
              >
                Open <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="arc-glass-interactive inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-violet-400/35 bg-violet-500/15 px-4 text-sm font-bold text-violet-50"
            >
              <Minimize2 className="h-4 w-4" />
              Exit
            </button>
          </header>
          <div className="min-h-0 flex-1 p-3 sm:p-4">
            <div className="arc-glass-card arc-glass-card-nexus arc-border-trace nexus-chart-fullscreen-frame relative h-full overflow-hidden rounded-2xl">
              <iframe
                title={`${symbol ?? "Token"} chart fullscreen`}
                src={dexChartEmbedUrl(chainId, pairAddress)}
                className="h-[calc(100%+2.5rem)] min-h-[50dvh] w-full border-0 sm:min-h-0"
                allow="clipboard-write"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-12 items-center justify-center border-t border-white/10 bg-[#050508] text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">
                Market chart
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
