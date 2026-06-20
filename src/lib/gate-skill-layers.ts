import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";

export type GateSkillLayerView = {
  id: string;
  title: string;
  score: number | null;
  stance: string;
  stanceTone: "long" | "flat" | "avoid";
  reason: string;
  metrics: string[];
  signal: string;
  flagged?: boolean;
};

function checksScore(passed?: number, total?: number): number | null {
  if (passed == null || total == null || total <= 0) return null;
  return Math.round((passed / total) * 100);
}

function signalStance(signal: string): { stance: string; tone: GateSkillLayerView["stanceTone"] } {
  if (signal === "ENTER_LONG") return { stance: "Strong", tone: "long" };
  if (signal === "AVOID" || signal === "EXIT") return { stance: "Weak", tone: "avoid" };
  return { stance: "Neutral", tone: "flat" };
}

function layer(
  id: string,
  title: string,
  signal: string,
  reason: string,
  metrics: string[],
  score: number | null,
  flagged?: boolean,
): GateSkillLayerView {
  const { stance, tone } = signalStance(signal);
  return { id, title, score, stance, stanceTone: tone, reason, metrics, signal, flagged };
}

/** Shared skill layer views — live CMC skill payload only. */
export function buildGateSkillLayers(skills: GateSkillsPayload): GateSkillLayerView[] {
  const momentumMetrics: string[] = [];
  if (skills.momentum.metrics) {
    const m = skills.momentum.metrics;
    if (m.rsi != null) momentumMetrics.push(`RSI ${m.rsi.toFixed(1)}`);
    if (m.macd) momentumMetrics.push(`MACD ${m.macd}`);
    if (m.fearGreed != null) momentumMetrics.push(`F&G ${m.fearGreed}`);
  }
  momentumMetrics.push(`${skills.momentum.checksPassed}/${skills.momentum.checksTotal} checks passed`);

  const layers: GateSkillLayerView[] = [
    layer(
      "momentum",
      "Momentum",
      skills.momentum.signal,
      skills.momentum.metrics?.rsi != null && skills.momentum.metrics.rsi >= 55
        ? "Trend persistence healthy."
        : skills.momentum.metrics?.rsi != null && skills.momentum.metrics.rsi <= 40
          ? "Momentum fading — constitution may veto."
          : "Momentum in neutral band.",
      momentumMetrics,
      checksScore(skills.momentum.checksPassed, skills.momentum.checksTotal),
    ),
    layer(
      "sentiment",
      "Sentiment divergence",
      skills.sentiment.signal,
      skills.sentiment.thesis || `Social heat ${skills.sentiment.socialHeat} · flow ${skills.sentiment.flowScore}.`,
      [
        `State: ${skills.sentiment.state.replace(/_/g, " ")}`,
        `Heat ${skills.sentiment.socialHeat} · flow ${skills.sentiment.flowScore}`,
        `Turnover ${skills.sentiment.turnover}`,
        skills.sentiment.thesis,
      ].filter(Boolean),
      skills.sentiment.flagged ? 42 : checksScore(2, 3),
      skills.sentiment.flagged,
    ),
    layer(
      "regime",
      "Market regime",
      skills.regime.signal,
      `${skills.regime.regime.replace(/-/g, " ")} tape · ${skills.regime.positioning.replace(/-/g, " ")}.`,
      [
        `Regime: ${skills.regime.regime}`,
        `Positioning: ${skills.regime.positioning}`,
        `Strategy: ${skills.regime.strategyMode}`,
        skills.regime.switchRule,
      ],
      skills.regime.regime === "risk-on" ? 78 : skills.regime.regime === "risk-off" ? 38 : 58,
    ),
  ];

  if (skills.trend) {
    const tm = skills.trend.metrics;
    layers.push(
      layer(
        "trend",
        "Trend alignment",
        skills.trend.signal,
        skills.trend.thesis || "Multi-timeframe alignment from live CMC changes.",
        [
          tm?.change1h != null ? `1h ${tm.change1h >= 0 ? "+" : ""}${tm.change1h.toFixed(2)}%` : "",
          tm?.change24h != null ? `24h ${tm.change24h >= 0 ? "+" : ""}${tm.change24h.toFixed(2)}%` : "",
          tm?.change7d != null ? `7d ${tm.change7d >= 0 ? "+" : ""}${tm.change7d.toFixed(2)}%` : "",
          tm?.change30d != null ? `30d ${tm.change30d >= 0 ? "+" : ""}${tm.change30d.toFixed(2)}%` : "",
          `${skills.trend.checksPassed}/${skills.trend.checksTotal} TF checks`,
        ].filter(Boolean),
        checksScore(skills.trend.checksPassed, skills.trend.checksTotal),
      ),
    );
  }

  if (skills.liquidity) {
    layers.push(
      layer(
        "liquidity",
        "Liquidity depth",
        skills.liquidity.signal,
        skills.liquidity.thesis || `Turnover ${skills.liquidity.turnover} — liquidity gate.`,
        [
          `Turnover ${skills.liquidity.turnover}`,
          skills.liquidity.volumeChange24h != null
            ? `Volume Δ24h ${skills.liquidity.volumeChange24h >= 0 ? "+" : ""}${skills.liquidity.volumeChange24h.toFixed(1)}%`
            : "",
          `${skills.liquidity.checksPassed}/${skills.liquidity.checksTotal} checks`,
          skills.liquidity.thesis,
        ].filter(Boolean),
        checksScore(skills.liquidity.checksPassed, skills.liquidity.checksTotal),
      ),
    );
  }

  if (skills.structural) {
    const sm = skills.structural.metrics;
    layers.push(
      layer(
        "structural",
        "Structural quality",
        skills.structural.signal,
        skills.structural.thesis || `Grade ${skills.structural.grade}.`,
        [
          `Grade ${skills.structural.grade}`,
          sm?.marketCap != null ? `Market cap $${(sm.marketCap / 1e9).toFixed(2)}B` : "",
          sm?.cmcRank != null ? `CMC rank #${sm.cmcRank}` : "",
          sm?.fdvRatio != null ? `FDV ratio ${sm.fdvRatio.toFixed(2)}` : "",
          `${skills.structural.checksPassed}/${skills.structural.checksTotal} checks`,
        ].filter(Boolean),
        checksScore(skills.structural.checksPassed, skills.structural.checksTotal),
      ),
    );
  }

  if (skills.relativeStrength) {
    const rm = skills.relativeStrength.metrics;
    layers.push(
      layer(
        "relative-strength",
        "Relative strength",
        skills.relativeStrength.signal,
        skills.relativeStrength.thesis ||
          `${skills.relativeStrength.role ?? "Inline"} vs ${rm?.benchmark ?? "BNB"}.`,
        [
          rm?.rs24h != null
            ? `RS 24h ${rm.rs24h >= 0 ? "+" : ""}${rm.rs24h.toFixed(2)}% vs ${rm.benchmark ?? "BNB"}`
            : "",
          rm?.rs7d != null ? `RS 7d ${rm.rs7d >= 0 ? "+" : ""}${rm.rs7d.toFixed(2)}%` : "",
          skills.relativeStrength.rotationScore != null
            ? `Rotation score ${skills.relativeStrength.rotationScore}/100`
            : "",
          `${skills.relativeStrength.checksPassed ?? "—"}/${skills.relativeStrength.checksTotal ?? "—"} checks`,
        ].filter(Boolean),
        skills.relativeStrength.rotationScore ?? null,
      ),
    );
  }

  if (skills.volatility) {
    const vm = skills.volatility.metrics;
    layers.push(
      layer(
        "volatility",
        "Volatility regime",
        skills.volatility.signal,
        skills.volatility.thesis || `${skills.volatility.state ?? "Neutral"} vol state.`,
        [
          `State: ${skills.volatility.state ?? "neutral"}`,
          vm?.atrPct != null ? `ATR ${vm.atrPct.toFixed(2)}%` : "",
          vm?.compressionRatio != null ? `Compression ${vm.compressionRatio.toFixed(2)}×` : "",
          skills.volatility.squeeze ? "Squeeze active" : "",
          skills.volatility.expansion ? "Expansion active" : "",
          `${skills.volatility.checksPassed ?? "—"}/${skills.volatility.checksTotal ?? "—"} checks`,
        ].filter(Boolean),
        vm?.atrPct != null ? Math.max(20, Math.min(90, Math.round(100 - vm.atrPct * 8))) : null,
      ),
    );
  }

  return layers;
}

export const CHAMBER_LAYER_TITLES: Record<string, string[]> = {
  market: ["Momentum", "Trend alignment", "Structural quality"],
  flow: ["Relative strength", "Liquidity depth"],
  behavior: ["Sentiment divergence"],
  risk: ["Volatility regime", "Market regime"],
};

export function pickLayersByTitle(layers: GateSkillLayerView[], titles: string[]): GateSkillLayerView[] {
  return layers.filter((l) => titles.includes(l.title));
}

export function chamberSummary(layers: GateSkillLayerView[]): string {
  if (!layers.length) return "Awaiting live skill data";
  const longCount = layers.filter((l) => l.signal === "ENTER_LONG").length;
  const avg =
    layers.filter((l) => l.score != null).reduce((s, l) => s + (l.score ?? 0), 0) /
      Math.max(1, layers.filter((l) => l.score != null).length) || null;
  const avgLabel = avg != null ? ` · avg ${Math.round(avg)}` : "";
  return `${longCount}/${layers.length} layers long${avgLabel} · ${layers.map((l) => l.title).join(", ")}`;
}
