"use client";

import { Activity, BarChart3, Brain, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";
import { NexusTAContent } from "@/components/nexus/nexus-ta-panel";
import { cn } from "@/lib/utils";
import type { TokenDossierPayload, LiveReasoningFactor, TaTimeframeBlock } from "@/lib/nexus-research-dossier";
import type { AgentSignal, TechnicalSnapshot } from "@/lib/storage";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { filterReasoningFactorsForDisplay } from "@/lib/reasoning-factors";

function FactorRow({ factor }: { factor: LiveReasoningFactor }) {
  const Icon =
    factor.impact === "bullish" ? TrendingUp : factor.impact === "bearish" ? TrendingDown : Activity;
  const border =
    factor.impact === "bullish"
      ? "border-l-emerald-400"
      : factor.impact === "bearish"
        ? "border-l-rose-400"
        : "border-l-white/25";

  return (
    <div
      className={cn(
        "flex gap-2 rounded-lg border border-white/[0.08] border-l-[3px] bg-black/30 px-3 py-2",
        border,
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/55" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white">{factor.label}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/70">{factor.detail}</p>
      </div>
    </div>
  );
}

function TaBadge({ signal }: { signal: "bullish" | "bearish" | "neutral" }) {
  const styles = {
    bullish: "border-emerald-400/35 bg-emerald-500/15 text-emerald-100",
    bearish: "border-rose-400/35 bg-rose-500/15 text-rose-100",
    neutral: "border-white/15 bg-white/5 text-white/70",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${styles[signal]}`}>
      {signal}
    </span>
  );
}

function MultiTimeframeTa({
  blocks,
  pattern,
}: {
  blocks: TaTimeframeBlock[];
  pattern?: { label: string; detail: string };
}) {
  if (blocks.length === 0) return null;
  return (
    <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
      {pattern && (
        <div className="rounded-xl border border-violet-400/20 bg-violet-500/[0.06] px-3 py-2">
          <p className="text-xs font-bold text-violet-100">{pattern.label}</p>
          <p className="mt-0.5 text-[11px] text-white/65">{pattern.detail}</p>
        </div>
      )}
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">15m & 1h (MACD · RSI · MAs)</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {blocks.map((tf) => (
          <div
            key={tf.timeframe}
            className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
          >
            <p className="mb-1.5 text-[10px] font-bold uppercase text-white/45">
              {tf.timeframe} · {tf.source === "birdeye_ohlcv" ? "Live OHLCV" : "Dex est."}
            </p>
            <p className="text-xs text-white/80">
              RSI {tf.rsi14} <TaBadge signal={tf.rsiSignal} /> · MACD <TaBadge signal={tf.macdSignal} />
            </p>
            {(tf.ma20 != null || tf.ma50 != null) && (
              <p className="mt-1 text-[10px] tabular-nums text-white/50">
                MA20 {tf.ma20?.toFixed(tf.ma20 < 1 ? 6 : 2) ?? "—"} · MA50{" "}
                {tf.ma50?.toFixed(tf.ma50 < 1 ? 6 : 2) ?? "—"}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function mergeAgent(
  token: TrendingMarketToken,
  payload: TokenDossierPayload | null,
): AgentSignal | undefined {
  return payload?.agent ?? token.agent;
}

function mergeFactors(
  agent: AgentSignal | undefined,
  live: TokenDossierPayload["liveReasoning"] | undefined,
): LiveReasoningFactor[] {
  const raw = agent?.reasoningFactors?.length
    ? agent.reasoningFactors.map((f) => ({
        label: f.label,
        detail: f.detail,
        impact: f.impact,
      }))
    : (live?.factors ?? []);
  return filterReasoningFactorsForDisplay(raw, 8);
}

function mergeNarrative(
  agent: AgentSignal | undefined,
  live: TokenDossierPayload["liveReasoning"] | undefined,
  fundamentals?: string[],
): string {
  const parts = [
    agent?.whyAction,
    agent?.reasoning && agent.reasoning !== agent.whyAction ? agent.reasoning : null,
    live?.narrative && !live.narrative.startsWith(`${agent?.action ?? "HOLD"} `) ? live.narrative : null,
    fundamentals?.[0],
  ].filter(Boolean) as string[];
  return parts.join(" ").trim();
}

export function NexusIntelCollapsibles({
  token,
  payload,
  loading,
  reasoningInStrip = false,
}: {
  token: TrendingMarketToken;
  payload: TokenDossierPayload | null;
  loading: boolean;
  /** Agent reasoning shown above chart area — hide duplicate collapsible */
  reasoningInStrip?: boolean;
}) {
  const agent = mergeAgent(token, payload);
  const live = payload?.liveReasoning;
  const dossier = payload?.dossier;
  const technical = (payload?.technical ?? token.intel?.technical) as TechnicalSnapshot | undefined;
  const taBlocks = dossier?.technical?.length ? dossier.technical : (payload?.dossier?.technical ?? []);

  const action = agent?.action ?? live?.action ?? "HOLD";
  const confidence = agent?.confidence ?? live?.confidence ?? 0;
  const riskScore = agent?.riskScore ?? live?.riskScore ?? 0;
  const factors = mergeFactors(agent, live);
  const narrative = mergeNarrative(agent, live, dossier?.fundamentals);

  const agentHint = `${action} · ${confidence}% conf · risk ${riskScore}/100 · ${factors.length} signals`;
  const taHint =
    live?.taHeadline ??
    (technical
      ? `RSI ${technical.rsi?.toFixed?.(0) ?? "—"} · MACD ${technical.macdSignal ?? "—"} · ${technical.trend?.replace?.("_", " ") ?? "—"}`
      : taBlocks.length > 0
        ? `${taBlocks.map((b) => `${b.timeframe} RSI ${b.rsi14}`).join(" · ")}`
        : dossier?.pattern.label ?? "Loading TA…");

  return (
    <div className="nexus-intel-tabs space-y-2">
      {!reasoningInStrip && (
        <NexusCollapsible
          label="Agent reasoning"
          hint={agentHint}
          variant="reasoning"
          icon={Brain}
          defaultOpen={false}
          showCollapseHint
        >
          <div className="space-y-3">
            {loading && !narrative && (
              <p className="flex items-center gap-2 text-xs text-white/55">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Pro trader dossier loading…
              </p>
            )}
            <p className="nexus-lead rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-2.5 text-sm leading-relaxed text-white/90">
              {narrative || agent?.whyAction || agent?.reasoning || "Reasoning loads when dossier finishes."}
            </p>
            {factors.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Signal breakdown</p>
                {factors.map((f) => (
                  <FactorRow key={`${f.label}-${f.detail.slice(0, 20)}`} factor={f} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/50">No factor breakdown yet — run Alpha Scan or wait for dossier.</p>
            )}
            {live?.sources?.length ? (
              <p className="text-[10px] text-white/40">{live.sources.length} intel sources fused</p>
            ) : null}
          </div>
        </NexusCollapsible>
      )}

      <NexusCollapsible
        label="Technical analysis"
        hint={taHint}
        variant="technical"
        icon={BarChart3}
        defaultOpen={false}
        showCollapseHint
      >
        {technical ? (
          <NexusTAContent technical={technical} priceUsd={token.priceUsd} />
        ) : taBlocks.length > 0 ? (
          <MultiTimeframeTa blocks={taBlocks} pattern={dossier?.pattern} />
        ) : loading ? (
          <p className="flex items-center gap-2 text-xs text-white/55">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Computing RSI, MACD, and moving averages…
          </p>
        ) : (
          <p className="text-xs text-white/50">TA unavailable for this token.</p>
        )}
      </NexusCollapsible>
    </div>
  );
}
