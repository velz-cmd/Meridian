"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRightLeft,
  ExternalLink,
  Radio,
  Scale,
  Shield,
} from "lucide-react";
import { useMeridianActivityLog } from "@/hooks/use-meridian-activity-log";
import { bscExplorerTx } from "@/lib/bsc-chain";
import { cn } from "@/lib/utils";
import type { ActivityKind, ActivityLevel } from "@/lib/meridian-activity-log";

const KIND_ICON: Record<ActivityKind, typeof Activity> = {
  permit: Scale,
  trade: ArrowRightLeft,
  gate: Radio,
  system: Activity,
};

const LEVEL_STYLE: Record<ActivityLevel, string> = {
  info: "text-cyan-100/85",
  success: "text-emerald-300",
  warn: "text-amber-300",
  error: "text-rose-300",
};

export function MeridianActivityLogPanel({
  className,
  title = "Agent activity log",
  maxHeight = "max-h-52",
}: {
  className?: string;
  title?: string;
  maxHeight?: string;
}) {
  const { entries } = useMeridianActivityLog();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [entries[0]?.id]);

  return (
    <div
      className={cn(
        "rounded-2xl border border-emerald-400/30 bg-black/40 shadow-[inset_0_0_24px_rgba(16,185,129,0.06)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-emerald-400/20 px-3 py-2">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/90">
          <Shield className="h-3.5 w-3.5" />
          {title}
        </p>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-200">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          LIVE
        </span>
      </div>
      <div ref={scrollRef} className={cn("space-y-0.5 overflow-y-auto p-2 font-mono text-[11px]", maxHeight)}>
        {entries.length === 0 ? (
          <p className="px-1 py-2 text-white/40">Pipeline warming up…</p>
        ) : (
          entries.map((e) => {
            const Icon = KIND_ICON[e.kind];
            const time = new Date(e.at).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            return (
              <div key={e.id} className="flex items-start gap-2 rounded-lg px-1.5 py-1 hover:bg-white/[0.03]">
                <Icon className={cn("mt-0.5 h-3 w-3 shrink-0", LEVEL_STYLE[e.level])} />
                <div className="min-w-0 flex-1">
                  <span className="text-white/35">{time}</span>{" "}
                  <span className={LEVEL_STYLE[e.level]}>{e.message}</span>
                  {e.txHash && (
                    <a
                      href={bscExplorerTx(e.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 inline-flex items-center gap-0.5 text-emerald-300/90 hover:underline"
                    >
                      tx <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="border-t border-white/[0.06] px-3 py-1.5 text-[9px] text-white/35">
        Permits · gate ranks · PancakeSwap txs — same loop judges watch on{" "}
        <Link href="/nexus" className="text-emerald-300/80 hover:underline">
          NEXUS
        </Link>
      </div>
    </div>
  );
}
