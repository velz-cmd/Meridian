"use client";

import { cn } from "@/lib/utils";
import type { GateBenchmarkFull, GateRoutePayload } from "@/lib/gate-route-types";

type RsRow = {
  symbol: string;
  rs24: number;
  rs7: number;
  role: string;
  rotationScore: number;
  signal: string;
  volState: string;
  conviction: number;
};

function buildRows(benchmarks: GateBenchmarkFull[], route: GateRoutePayload | null): RsRow[] {
  return benchmarks
    .map((b) => {
      const rs = b.skills?.relativeStrength as
        | {
            metrics?: { rs24h?: number; rs7d?: number };
            role?: string;
            rotationScore?: number;
            signal?: string;
          }
        | undefined;
      const vol = b.skills?.volatility as { state?: string } | undefined;
      const ranked = route?.ranked.find((r) => r.symbol === b.symbol);
      return {
        symbol: b.symbol,
        rs24: rs?.metrics?.rs24h ?? 0,
        rs7: rs?.metrics?.rs7d ?? 0,
        role: rs?.role ?? "inline",
        rotationScore: rs?.rotationScore ?? 50,
        signal: rs?.signal ?? "HOLD",
        volState: vol?.state ?? "—",
        conviction: ranked?.conviction ?? b.conviction ?? 0,
      };
    })
    .sort((a, b) => b.rotationScore - a.rotationScore);
}

function roleTone(role: string) {
  if (role === "leader") return "text-emerald-300 border-emerald-400/35 bg-emerald-500/10";
  if (role === "laggard" || role === "fade") return "text-rose-300 border-rose-400/35 bg-rose-500/10";
  if (role === "outperform") return "text-cyan-300 border-cyan-400/35 bg-cyan-500/10";
  return "text-white/60 border-white/10 bg-black/25";
}

/** BSC capital rotation — relative strength vs BNB from live CMC batch (not UI fiction). */
export function GateCapitalRotation({
  benchmarks,
  route,
}: {
  benchmarks: GateBenchmarkFull[];
  route: GateRoutePayload | null;
}) {
  const rows = buildRows(benchmarks, route);
  if (rows.length === 0) return null;

  const lead = rows[0];
  const routerLead = route?.ranked?.[0];

  return (
    <section className="gate-capital-rotation rounded-2xl border border-cyan-400/20 bg-cyan-950/15 overflow-hidden">
      <div className="border-b border-white/8 px-4 py-3 sm:px-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/85">
          BSC capital rotation · relative strength skill
        </p>
        <p className="mt-1 text-sm text-white/70">
          RS ranks marginal flow vs BNB (CMC 24h/7d). Router deploys by conviction —{" "}
          <span className="font-semibold text-white">{routerLead?.symbol ?? lead?.symbol}</span> leads router at{" "}
          {routerLead?.conviction ?? "—"} conv · RS leader {lead?.symbol} at {lead?.rotationScore}/100.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-[11px]">
          <thead>
            <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-white/40">
              <th className="px-4 py-2 font-medium">Asset</th>
              <th className="px-2 py-2 font-medium">RS 24h</th>
              <th className="px-2 py-2 font-medium">RS 7d</th>
              <th className="px-2 py-2 font-medium">Role</th>
              <th className="px-2 py-2 font-medium">Vol</th>
              <th className="px-2 py-2 font-medium">Conv</th>
              <th className="px-4 py-2 font-medium">Rotation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.symbol} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="px-4 py-2.5 font-bold text-white">{r.symbol}</td>
                <td className={cn("px-2 py-2.5 tabular-nums", r.rs24 >= 0 ? "text-emerald-300" : "text-rose-300")}>
                  {r.rs24 >= 0 ? "+" : ""}
                  {r.rs24.toFixed(2)}%
                </td>
                <td className={cn("px-2 py-2.5 tabular-nums", r.rs7 >= 0 ? "text-emerald-300" : "text-rose-300")}>
                  {r.rs7 >= 0 ? "+" : ""}
                  {r.rs7.toFixed(2)}%
                </td>
                <td className="px-2 py-2.5">
                  <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px] capitalize", roleTone(r.role))}>
                    {r.role}
                  </span>
                </td>
                <td className="px-2 py-2.5 capitalize text-white/55">{r.volState}</td>
                <td className="px-2 py-2.5 tabular-nums text-violet-200">{r.conviction}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                        style={{ width: `${r.rotationScore}%` }}
                      />
                    </div>
                    <span className="tabular-nums text-white/70">{r.rotationScore}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
