"use client";

import { Brain, Loader2, Target } from "lucide-react";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";
import { cn } from "@/lib/utils";
import type { TokenDossierPayload, LiveReasoningFactor } from "@/lib/nexus-research-dossier";
import type { AgentSignal } from "@/lib/storage";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import {
  FEED_INTEL_LABEL,
  ALPHA_INTEL_LABEL,
  REASONING_HEADLINE,
  NEXUS_GMGN_PRO_SKILLS,
  agentVerdictLine,
  sanitizeIntelSources,
} from "@/lib/nexus-copy";
import { filterReasoningFactorsForDisplay } from "@/lib/reasoning-factors";

function FactorRow({ factor }: { factor: LiveReasoningFactor }) {
  const Icon =
    factor.impact === "bullish" ? "▲" : factor.impact === "bearish" ? "▼" : "·";
  return (
    <li className="flex gap-2 rounded-lg border border-white/[0.08] bg-black/25 px-2.5 py-2 text-[11px] leading-snug text-white/80">
      <span className="shrink-0 font-bold text-white/45">{Icon}</span>
      <span>
        <span className="font-semibold text-white">{factor.label}</span>
        <span className="text-white/60"> — {factor.detail}</span>
      </span>
    </li>
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
  return filterReasoningFactorsForDisplay(raw, 6);
}

export function NexusAgentReasoningStrip({
  token,
  payload,
  loading,
  tier,
  alphaThesis,
}: {
  token: TrendingMarketToken;
  payload: TokenDossierPayload | null;
  loading: boolean;
  tier: "feed" | "alpha";
  alphaThesis?: string;
}) {
  const agent = mergeAgent(token, payload);
  const live = payload?.liveReasoning;
  const action = agent?.action ?? live?.action ?? "HOLD";
  const confidence = agent?.confidence ?? live?.confidence ?? 0;
  const riskScore = agent?.riskScore ?? live?.riskScore ?? 0;
  const factors = mergeFactors(agent, live);
  const isAlpha = tier === "alpha";

  const narrative =
    live?.narrative ||
    agent?.whyAction ||
    agent?.reasoning ||
    (token.intel as { gateSkills?: { composite?: { thesis?: string } } } | undefined)?.gateSkills
      ?.composite?.thesis ||
    alphaThesis ||
    "";

  const coachLines = live?.coachLines ?? [];
  const gmgnNotes = live?.gmgnNotes ?? [];
  const collapsedHint = agentVerdictLine(agent?.whyAction, alphaThesis, narrative) ||
    `${action} · ${confidence}% · risk ${riskScore}${factors.length ? ` · ${factors.length} signals` : ""}`;

  const signalsLabel = isAlpha ? "Full signal stack" : "Key signals";
  const signalsHint =
    factors.length > 0
      ? factors
          .slice(0, 2)
          .map((f) => f.label)
          .join(" · ")
      : "No actionable edges yet";

  return (
    <NexusCollapsible
      label="Agent reasoning"
      hint={collapsedHint}
      variant="reasoning"
      icon={Brain}
      defaultOpen={false}
      showCollapseHint
      className={cn(
        "nexus-agent-reasoning-strip",
        isAlpha ? "border-fuchsia-400/25" : "border-cyan-400/25",
      )}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase",
              isAlpha
                ? "border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-100"
                : "border-white/15 bg-black/30 text-white/55",
            )}
          >
            {isAlpha ? ALPHA_INTEL_LABEL : FEED_INTEL_LABEL}
          </span>
          <span className="text-[10px] tabular-nums font-semibold text-white/70">
            {action} · {confidence}% · risk {riskScore}
          </span>
          <p className="w-full text-[10px] text-white/45">{REASONING_HEADLINE}</p>
        </div>

        {loading && !narrative ? (
          <p className="flex items-center gap-2 text-xs text-white/55">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {isAlpha
              ? "Deep scan: holders · flow · TA · contract risk…"
              : "Desk scout: market flow · TA · entry gate — not AI signal spam…"}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-white/90">
            {narrative ||
              (agent?.whyAction ?? agent?.reasoning) ||
              `${action} · ${confidence}% confidence · live desk rules (not a random signal).`}
          </p>
        )}

        {isAlpha && coachLines.length > 0 && (
          <div className="rounded-lg border border-fuchsia-400/20 bg-black/30 px-3 py-2.5">
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-fuchsia-200/90">
              <Target className="h-3.5 w-3.5" />
              Pro coach playbook
            </p>
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-white/75">
              {coachLines.map((line) => (
                <li key={line.slice(0, 40)}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {!isAlpha && coachLines[0] && (
          <p className="text-[11px] text-white/55 italic">{coachLines[0]}</p>
        )}

        {isAlpha && (
          <div className="flex flex-wrap gap-1">
            {NEXUS_GMGN_PRO_SKILLS.map((skill) => (
              <span
                key={skill}
                className="rounded-md border border-cyan-400/20 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] text-cyan-100/90"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {gmgnNotes.length > 0 && (
          <ul className="space-y-1 text-[10px] text-cyan-200/75">
            {gmgnNotes.map((n) => (
              <li key={n}>On-chain · {n}</li>
            ))}
          </ul>
        )}

        {factors.length > 0 && (
          <NexusCollapsible
            label={signalsLabel}
            hint={signalsHint}
            variant="reasoning"
            defaultOpen={false}
            showCollapseHint
            className="!shadow-none"
          >
            <ul className="space-y-1">
              {factors.map((f) => (
                <FactorRow key={`${f.label}-${f.detail.slice(0, 28)}`} factor={f} />
              ))}
            </ul>
          </NexusCollapsible>
        )}

        {live?.sources?.length ? (
          <p className="text-[10px] text-white/40">
            Sources: {sanitizeIntelSources(live.sources).join(" · ")}
            {payload?.fetchedAt ? ` · ${new Date(payload.fetchedAt).toLocaleTimeString()}` : ""}
          </p>
        ) : null}
      </div>
    </NexusCollapsible>
  );
}
