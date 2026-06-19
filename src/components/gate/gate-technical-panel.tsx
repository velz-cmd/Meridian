"use client";

import { ExternalLink } from "lucide-react";
import { GateAgentReasoning } from "@/components/gate/gate-agent-reasoning";
import { GateSkillStack } from "@/components/gate/gate-skill-stack";
import { GateDataProvenance } from "@/components/gate/gate-data-provenance";
import { GateSignalMeter } from "@/components/gate/gate-signal-meter";
import { buildGateSignalMeter } from "@/lib/gate-signal-meter";
import { effectiveGateSignal, effectivePosition } from "@/lib/gate-effective-signal";
import type { GateBenchmarkFull, GateRoutePayload } from "@/lib/gate-route-types";
import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";
import { cn } from "@/lib/utils";

function RsiBand({ rsi }: { rsi?: number }) {
  if (rsi == null) return null;
  const pct = Math.min(100, Math.max(0, rsi));
  let band = "In range";
  let tone = "text-cyan-200";
  if (rsi > 72) {
    band = "Overbought band";
    tone = "text-rose-300";
  } else if (rsi < 35) {
    band = "Oversold band";
    tone = "text-emerald-300";
  }
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="mb-2 flex justify-between text-[10px] uppercase tracking-wider text-white/45">
        <span>RSI (14) · CMC / venue daily</span>
        <span className={tone}>{band}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-[35%] w-[37%] rounded-full bg-emerald-500/25"
          title="Entry band 35–72"
        />
        <div
          className="absolute inset-y-0 w-1 rounded-full bg-cyan-400"
          style={{ left: `${pct}%` }}
        />
      </div>
      <p className="mt-2 font-mono text-lg font-bold text-white">{rsi.toFixed(1)}</p>
      <p className="text-[10px] text-white/40">Constitution entry band: 35 ≤ RSI ≤ 72 · force exit &gt; 78</p>
    </div>
  );
}

export function GateTechnicalPanel({
  selected,
  route,
  skills,
  onOpenNexus,
}: {
  selected: GateBenchmarkFull;
  route: GateRoutePayload | null;
  skills?: GateSkillsPayload | null;
  onOpenNexus: () => void;
}) {
  const gate = selected.gate;
  const displaySignal = effectiveGateSignal(gate, skills);
  const long = effectivePosition(gate, skills) === "LONG";
  const verdictLabel = long ? "LONG" : displaySignal === "EXIT" ? "EXIT" : displaySignal === "AVOID" ? "AVOID" : "FLAT";
  const checks = gate.checks ?? [];
  const passedWeight = checks.filter((c) => c.pass).reduce((s, c) => s + c.weight, 0);
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const agreementPct = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;
  const verdictConfidence = gate.confidence ?? skills?.composite.alignmentScore ?? agreementPct;
  const signalRows = buildGateSignalMeter(selected, route, skills);
  const rsi = selected.market.rsi ?? skills?.momentum?.metrics?.rsi;
  const macd = selected.market.macdSignal ?? skills?.momentum?.metrics?.macd;

  return (
    <div className="gate-technical-panel space-y-3">
      <GateAgentReasoning selected={selected} skills={skills} />

      <div className="grid gap-3 sm:grid-cols-2">
        <RsiBand rsi={rsi} />
        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
          <p className="text-[10px] uppercase tracking-wider text-white/45">MACD · momentum layer</p>
          <p className={cn("mt-2 text-lg font-bold capitalize", macd === "bearish" ? "text-rose-300" : macd === "bullish" ? "text-emerald-300" : "text-white")}>
            {macd ?? "—"}
          </p>
          <p className="mt-1 text-[10px] text-white/40">
            Entry rule: MACD not bearish vs momentum unless 24h &lt; 15%
          </p>
        </div>
      </div>

      <GateSignalMeter rows={signalRows} verdict={verdictLabel} verdictConfidence={verdictConfidence} />

      {skills && (
        <GateSkillStack skills={skills} constitutionSignal={gate.signal} />
      )}

      <GateDataProvenance sources={selected.fieldSources} oracle={selected.oracle} />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
        <p className="text-xs text-white/55">
          Need 15m / 1h OHLCV, dossier, and wallet desk? Continue in NEXUS — same benchmark token.
        </p>
        <button
          type="button"
          onClick={onOpenNexus}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20"
        >
          Open NEXUS TA
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
