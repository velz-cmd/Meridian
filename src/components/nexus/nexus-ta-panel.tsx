"use client";

import { Activity, BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { formatUsd } from "@/lib/utils";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";
import type { TechnicalSnapshot } from "@/lib/storage";
import type { TechnicalAnalysis } from "@/lib/technical-analysis";

export function NexusTAContent({
  technical,
  priceUsd,
}: {
  technical: TechnicalSnapshot | TechnicalAnalysis;
  priceUsd?: number;
}) {
  const ta = technical as TechnicalAnalysis;
  const support = "support" in ta ? ta.support : undefined;
  const resistance = "resistance" in ta ? ta.resistance : undefined;

  return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2.5">
          <Stat
            label="RSI"
            value={technical.rsi.toFixed(1)}
            sub={technical.rsiSignal}
            tone={
              technical.rsiSignal === "oversold"
                ? "cyan"
                : technical.rsiSignal === "overbought"
                  ? "rose"
                  : "neutral"
            }
          />
          <Stat
            label="MACD"
            value={technical.macd.toFixed(2)}
            sub={technical.macdSignal}
            tone={technical.macdSignal === "bullish" ? "emerald" : technical.macdSignal === "bearish" ? "rose" : "neutral"}
          />
          <Stat
            label="TA score"
            value={`${technical.score}`}
            sub={technical.trend.replace("_", " ")}
            tone={technical.score >= 60 ? "emerald" : technical.score <= 40 ? "rose" : "neutral"}
          />
        </div>

        {priceUsd && support !== undefined && resistance !== undefined && (
          <div className="flex flex-wrap gap-3 rounded-xl border border-violet-400/20 bg-violet-500/[0.06] px-3 py-2">
            <span className="text-xs text-white/70">
              Support <strong className="text-violet-100">{formatUsd(support)}</strong>
            </span>
            <span className="text-white/25">|</span>
            <span className="text-xs text-white/70">
              Resistance <strong className="text-violet-100">{formatUsd(resistance)}</strong>
            </span>
          </div>
        )}

        <p className="nexus-lead">{technical.trendLine}</p>

        <div className="flex flex-wrap gap-2">
          {technical.macdSignal === "bullish" && (
            <Tag icon={<TrendingUp className="h-3.5 w-3.5" />} text="MACD bullish" color="emerald" />
          )}
          {technical.macdSignal === "bearish" && (
            <Tag icon={<TrendingDown className="h-3.5 w-3.5" />} text="MACD bearish" color="rose" />
          )}
          {technical.rsiSignal === "oversold" && <Tag text="RSI oversold" color="cyan" />}
          {technical.rsiSignal === "overbought" && <Tag text="RSI overbought" color="rose" />}
        </div>

        <p className="nexus-muted flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 shrink-0 text-violet-300/80" />
          {"taSource" in technical && technical.taSource === "birdeye_ohlcv"
            ? "Live OHLCV candles (15m / 1h when available)"
            : "Derived from live market price changes (m5 / h1 / h6 / h24)"}
        </p>
      </div>
  );
}

export function NexusTAPanel({
  technical,
  priceUsd,
  defaultOpen = false,
  showCollapseHint = false,
  embedded = false,
}: {
  technical?: TechnicalSnapshot | TechnicalAnalysis | null;
  priceUsd?: number;
  defaultOpen?: boolean;
  showCollapseHint?: boolean;
  /** Render stats only (parent supplies collapsible) */
  embedded?: boolean;
}) {
  if (!technical) return null;

  const src =
    "taSource" in technical && technical.taSource
      ? technical.taSource === "birdeye_ohlcv"
        ? "Live OHLCV"
        : "Market data"
      : null;
  const hint = `RSI ${technical.rsi.toFixed(0)} · MACD ${technical.macdSignal} · ${technical.trend.replace("_", " ")} · ${technical.score}/100${src ? ` · ${src}` : ""}`;

  if (embedded) {
    return <NexusTAContent technical={technical} priceUsd={priceUsd} />;
  }

  return (
    <NexusCollapsible
      label="Technical analysis"
      hint={hint}
      variant="technical"
      icon={BarChart3}
      defaultOpen={defaultOpen}
      showCollapseHint={showCollapseHint}
    >
      <NexusTAContent technical={technical} priceUsd={priceUsd} />
    </NexusCollapsible>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "emerald" | "rose" | "cyan" | "neutral";
}) {
  const tones = {
    emerald: "border-emerald-400/30 bg-emerald-500/10",
    rose: "border-rose-400/30 bg-rose-500/10",
    cyan: "border-cyan-400/30 bg-cyan-500/10",
    neutral: "border-white/12 bg-white/[0.04]",
  };
  const valueColor = {
    emerald: "text-emerald-100",
    rose: "text-rose-100",
    cyan: "text-cyan-100",
    neutral: "text-white",
  };

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${tones[tone]}`}>
      <p className="nexus-caption">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${valueColor[tone]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs capitalize text-white/75">{sub}</p>}
    </div>
  );
}

function Tag({
  text,
  icon,
  color,
}: {
  text: string;
  icon?: React.ReactNode;
  color: "emerald" | "rose" | "cyan";
}) {
  const styles = {
    emerald: "border-emerald-400/35 bg-emerald-400/12 text-emerald-100",
    rose: "border-rose-400/35 bg-rose-400/12 text-rose-100",
    cyan: "border-cyan-400/35 bg-cyan-400/12 text-cyan-100",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${styles[color]}`}
    >
      {icon}
      {text}
    </span>
  );
}
