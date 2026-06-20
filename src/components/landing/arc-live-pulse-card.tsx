"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Radio, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";

type GateRoutePayload = {
  route?: { allocation?: { primary?: string | null }; regime?: string };
  benchmarks?: { symbol: string; permit?: string }[];
  degraded?: boolean;
};

/** Live strategy pulse from /api/gate/route — no hardcoded marketing numbers. */
export function ArcLivePulseCard() {
  const [data, setData] = useState<GateRoutePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/gate/route", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("route unavailable");
        return r.json() as Promise<GateRoutePayload>;
      })
      .then((j) => {
        if (!cancelled) {
          setData(j);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const lead = data?.route?.allocation?.primary;
  const regime = data?.route?.regime;
  const grants = data?.benchmarks?.filter((b) => b.permit === "GRANT").length ?? 0;
  const benchCount = data?.benchmarks?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.45 }}
      className="arc-glass-card arc-live-pulse absolute right-[2%] top-[16%] z-20 hidden max-w-[240px] p-3 xl:block"
    >
      <div className="flex items-center gap-3">
        <ArcIcon3d icon={Zap} theme="home" size="sm" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-white/45">Strategy · live</p>
          {loading ? (
            <p className="flex items-center gap-1.5 text-sm text-white/60">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing…
            </p>
          ) : error ? (
            <p className="text-sm text-white/50">Live scan unavailable</p>
          ) : lead ? (
            <>
              <p className="text-sm font-medium text-white">Lead · {lead}</p>
              <p className="font-mono text-[10px] text-white/45">
                {regime?.replace(/-/g, " ") ?? "regime —"} · {grants}/{benchCount || "—"} cleared
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-white/70">All symbols on hold</p>
              <p className="font-mono text-[10px] text-white/45">
                {regime?.replace(/-/g, " ") ?? "Awaiting ranking"} · {grants}/{benchCount || "—"} cleared
              </p>
            </>
          )}
          {data?.degraded ? (
            <p className="mt-0.5 text-[10px] text-white/35">Using cached quotes</p>
          ) : null}
          <Link href="/gate" className="mt-1 inline-flex items-center gap-1 text-[10px] text-cyan-300/90 hover:underline">
            <Radio className="h-3 w-3" /> Open Strategy desk
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
