"use client";

import { Loader2 } from "lucide-react";
import { GATE_SYMBOLS, type GateSymbol } from "@/lib/gate-constants";
import {
  CHECK_PSEUDOCODE,
  EXIT_PSEUDOCODE,
  buildStrategyPseudocode,
  checkRuleKind,
  type RuleCardKind,
} from "@/lib/gate-rule-pseudocode";
import { buildGateSignalMeter } from "@/lib/gate-signal-meter";
import {
  GATE_STRATEGY_NAME,
  GATE_STRATEGY_TAGLINE,
  STRATEGY_EXIT_RULES,
  STRATEGY_POSITION_RULES,
  GITHUB_SKILL,
  strategyPosition,
  strategySignalLabel,
} from "@/lib/gate-strategy-copy";
import { GateDataProvenance } from "@/components/gate/gate-data-provenance";
import { GateEquityChart } from "@/components/gate/gate-equity-chart";
import { GateSignalMeter } from "@/components/gate/gate-signal-meter";
import { GateVerdictBlock } from "@/components/gate/gate-verdict-block";
import type { GateBenchmarkFull, GateRoutePayload } from "@/lib/gate-route-types";
import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";
import { cn } from "@/lib/utils";

type BacktestPayload = {
  ok: boolean;
  error?: string;
  hint?: string;
  bars?: number;
  dataSource?: string;
  backtest?: { totalReturnPct: number; maxDrawdownPct: number; winRatePct: number; roundTrips: number };
  compare?: {
    constitution: { totalReturnPct: number; maxDrawdownPct: number };
    naiveAgent: { totalReturnPct: number; maxDrawdownPct: number };
    edge: { returnDeltaPct: number; drawdownSavedPct: number };
  };
  equityCurves?: { t: string | number; constitution: number; naive: number }[];
  note?: string;
};

const LOAD_STEPS = [
  "Fetching CMC global metrics",
  "Loading benchmark quotes",
  "Running constitution checks",
  "Computing skill layers",
  "Packaging live spec",
];

const SHORTCUTS: { sym: GateSymbol; title: string; sub: string }[] = [
  { sym: "BNB", title: "BNB momentum", sub: "Router lead · full rule stack" },
  { sym: "CAKE", title: "CAKE liquidity", sub: "Turnover + structure checks" },
  { sym: "FLOKI", title: "FLOKI sentiment", sub: "Social heat · flow score" },
  { sym: "XVS", title: "XVS regime", sub: "Macro tape · alignment" },
];

function RuleCard({
  kind,
  condition,
  code,
  pass,
}: {
  kind: RuleCardKind;
  condition: string;
  code: string;
  pass?: boolean;
}) {
  return (
    <div className={cn("gate-rule-item", kind, pass === false && "fail")}>
      <span className={cn("gate-rule-badge", kind)}>{kind.toUpperCase()}</span>
      <div className="min-w-0">
        <p className="gate-rule-text">{condition}</p>
        <p className="gate-rule-code">{code}</p>
      </div>
    </div>
  );
}

function LiveDot() {
  return <span className="gate-stat-live">live cmc</span>;
}

export function GateOutputPanel({
  selected,
  route,
  skills,
  loading,
  backtest,
  backtestLoading,
  backtestRequested,
  onQuickSelect,
  onRunBacktest,
  onOpenNexus,
}: {
  selected?: GateBenchmarkFull;
  route: GateRoutePayload | null;
  skills?: GateSkillsPayload | null;
  loading?: boolean;
  backtest: BacktestPayload | null;
  backtestLoading: boolean;
  backtestRequested: boolean;
  onQuickSelect: (sym: GateSymbol) => void;
  onRunBacktest: () => void;
  onOpenNexus: () => void;
}) {
  if (loading && !selected) {
    return (
      <div className="gate-output-panel">
        <div className="gate-output-empty">
          <div className="gate-loading-bars">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="gate-loading-bar" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
          <p className="gate-load-ticker">{LOAD_STEPS[0]}</p>
          <div className="gate-load-steps">
            {LOAD_STEPS.map((s, i) => (
              <div key={s} className={cn("gate-load-step", i === 0 && "cur")}>
                <span className="gate-load-step-ic">{i === 0 ? "›" : "·"}</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="gate-output-panel">
        <div className="gate-output-empty">
          <p className="gate-empty-glyph">Σ</p>
          <p className="gate-empty-title">Ready to analyze</p>
          <p className="gate-empty-sub">
            Pick a BSC benchmark on the left — output updates from the live rule engine. No generated stats.
          </p>
          <div className="gate-shortcut-grid">
            {SHORTCUTS.map((sc) => (
              <button key={sc.sym} type="button" className="gate-shortcut" onClick={() => onQuickSelect(sc.sym)}>
                <p className="gate-shortcut-title">{sc.title}</p>
                <p className="gate-shortcut-sub">{sc.sub}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const gate = selected.gate;
  const checks = gate.checks ?? [];
  const position = strategyPosition(gate.signal);
  const long = position === "LONG";
  const displaySignal = skills?.composite?.signal ?? gate.signal;
  const pseudocode = buildStrategyPseudocode(selected.symbol, checks, displaySignal);

  const passedWeight = checks.filter((c) => c.pass).reduce((s, c) => s + c.weight, 0);
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const agreementPct = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;
  const verdictConfidence = gate.confidence ?? skills?.composite.alignmentScore ?? agreementPct;
  const signalRows = buildGateSignalMeter(selected, route, skills);
  const verdictLabel = long ? "LONG" : displaySignal === "EXIT" ? "EXIT" : displaySignal === "AVOID" ? "AVOID" : "FLAT";

  const entryChecks = checks.filter((c) => checkRuleKind(c.id) === "entry");
  const filterChecks = checks.filter((c) => checkRuleKind(c.id) === "filter");

  const regimeRows = [
    {
      label: skills?.regime.regime?.replace(/-/g, " ") ?? gate.regime?.replace(/-/g, " ") ?? "Neutral",
      action: skills?.regime.positioning ?? "Hold flat unless tier clears",
      color: "#67e8f9",
    },
    {
      label: "Current tape",
      action: skills?.regime.strategyMode ?? gate.thesis?.slice(0, 64) ?? "—",
      color: long ? "#00D4AA" : "#6B7A99",
    },
    {
      label: "Composite read",
      action: `${skills?.composite.signal?.replace("_", " ") ?? gate.signal} · ${skills?.composite.alignmentScore ?? agreementPct}/100`,
      color: long ? "#00D4AA" : "#FF4757",
    },
  ];

  const underperformed =
    backtest?.ok &&
    backtest.compare &&
    backtest.backtest &&
    backtest.backtest.totalReturnPct < backtest.compare.naiveAgent.totalReturnPct;

  const fng = route?.fearGreed ?? selected.market.fearGreed ?? 50;

  return (
    <div className="gate-output-panel">
      <div className="gate-strategy-output">
        <div className="gate-strategy-header">
          <div>
            <p className="gate-strategy-title">
              {selected.symbol} · {GATE_STRATEGY_NAME}
            </p>
            <p className="gate-strategy-tagline">{gate.thesis ?? GATE_STRATEGY_TAGLINE}</p>
            <div className="gate-meta-chips">
              <span className="gate-meta-chip accent">{gate.tier.toUpperCase()}</span>
              <span className={cn("gate-meta-chip", long ? "green" : "")}>{position}</span>
              <span className="gate-meta-chip">{strategySignalLabel(displaySignal)}</span>
              {selected.cmcLive && <span className="gate-meta-chip green">CMC live</span>}
              {GATE_SYMBOLS.map((s) => s).includes(selected.symbol as GateSymbol) && (
                <span className="gate-meta-chip">{selected.symbol}/USDT</span>
              )}
            </div>
          </div>
          <div className="gate-score-ring">
            <div className="gate-score-value">{gate.confidence ?? agreementPct}</div>
            <div className="gate-score-label">Conviction</div>
          </div>
        </div>

        <div className="gate-stat-grid">
          <div className="gate-stat-card">
            <p className="gate-stat-label">Price</p>
            <p className="gate-stat-value">
              ${selected.market.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </p>
            <p className={cn("gate-stat-sub", selected.market.change24h >= 0 ? "green" : "red")}>
              {selected.market.change24h >= 0 ? "+" : ""}
              {selected.market.change24h.toFixed(2)}% 24h
            </p>
            {selected.cmcLive && <LiveDot />}
          </div>
          <div className="gate-stat-card">
            <p className="gate-stat-label">Fear & Greed</p>
            <p className={cn("gate-stat-value", fng > 60 ? "red" : fng < 40 ? "green" : "accent")}>{fng}</p>
            <p className="gate-stat-sub">{fng > 60 ? "Greed" : fng < 40 ? "Fear" : "Neutral"}</p>
            {selected.cmcLive && <LiveDot />}
          </div>
          <div className="gate-stat-card">
            <p className="gate-stat-label">Checks</p>
            <p className="gate-stat-value accent">
              {gate.checksPassed}/{gate.checksTotal}
            </p>
            <p className="gate-stat-sub">Agreement {agreementPct}%</p>
          </div>
          <div className="gate-stat-card">
            <p className="gate-stat-label">Edge</p>
            <p className="gate-stat-value green">+{gate.edge ?? 0}</p>
            <p className="gate-stat-sub">{gate.regime?.replace(/-/g, " ") ?? "—"}</p>
          </div>
          {backtest?.ok && backtest.backtest && (
            <>
              <div className="gate-stat-card">
                <p className="gate-stat-label">90d return</p>
                <p className={cn("gate-stat-value", backtest.backtest.totalReturnPct >= 0 ? "green" : "red")}>
                  {backtest.backtest.totalReturnPct >= 0 ? "+" : ""}
                  {backtest.backtest.totalReturnPct}%
                </p>
              </div>
              <div className="gate-stat-card">
                <p className="gate-stat-label">Win rate</p>
                <p className="gate-stat-value">{backtest.backtest.winRatePct}%</p>
              </div>
              <div className="gate-stat-card">
                <p className="gate-stat-label">Max DD</p>
                <p className="gate-stat-value red">{backtest.backtest.maxDrawdownPct}%</p>
              </div>
              <div className="gate-stat-card">
                <p className="gate-stat-label">vs naive</p>
                <p className="gate-stat-value accent">
                  {backtest.compare?.edge.returnDeltaPct != null
                    ? `${backtest.compare.edge.returnDeltaPct >= 0 ? "+" : ""}${backtest.compare.edge.returnDeltaPct}%`
                    : "—"}
                </p>
              </div>
            </>
          )}
        </div>

        <GateDataProvenance sources={selected.fieldSources} oracle={selected.oracle} />

        <GateSignalMeter rows={signalRows} verdict={verdictLabel} verdictConfidence={verdictConfidence} />

        <GateVerdictBlock
          signal={displaySignal}
          confidence={verdictConfidence}
          regime={skills?.regime.regime ?? gate.regime}
          thesis={gate.thesis}
        />

        <div className="gate-rules-grid">
          <div className="gate-section-block">
            <div className="gate-section-block-header">Entry & filter · live checks</div>
            <div className="gate-section-block-body">
              <div className="gate-rule-list">
                {entryChecks.length
                  ? entryChecks.map((c) => (
                      <RuleCard
                        key={c.id}
                        kind={checkRuleKind(c.id)}
                        condition={c.label}
                        code={CHECK_PSEUDOCODE[c.id] ?? c.id}
                        pass={c.pass}
                      />
                    ))
                  : checks.map((c) => (
                      <RuleCard
                        key={c.id}
                        kind={checkRuleKind(c.id)}
                        condition={c.label}
                        code={CHECK_PSEUDOCODE[c.id] ?? c.id}
                        pass={c.pass}
                      />
                    ))}
              </div>
            </div>
          </div>
          <div className="gate-section-block">
            <div className="gate-section-block-header">Exit · constitution</div>
            <div className="gate-section-block-body">
              <div className="gate-rule-list">
                {STRATEGY_EXIT_RULES.map((rule, i) => (
                  <RuleCard
                    key={rule}
                    kind="exit"
                    condition={rule}
                    code={Object.values(EXIT_PSEUDOCODE)[i] ?? "exit_rule()"}
                  />
                ))}
                {filterChecks.map((c) => (
                  <RuleCard
                    key={`f-${c.id}`}
                    kind="filter"
                    condition={c.label}
                    code={CHECK_PSEUDOCODE[c.id] ?? c.id}
                    pass={c.pass}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="gate-section-block">
          <div className="gate-section-block-header">Market regime map</div>
          <div className="gate-section-block-body gate-regime-grid">
            {regimeRows.map((r) => (
              <div key={r.label} className="gate-regime-card">
                <div className="gate-regime-dot" style={{ background: r.color }} />
                <div>
                  <p className="gate-regime-label">{r.label}</p>
                  <p className="gate-regime-action" style={{ color: r.color }}>
                    {r.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="gate-section-block">
          <div className="gate-section-block-header">Position & replay rules</div>
          <div className="gate-section-block-body gate-risk-grid">
            {STRATEGY_POSITION_RULES.map((rule) => (
              <div key={rule} className="gate-risk-item">
                <p className="gate-risk-val">{rule}</p>
              </div>
            ))}
          </div>
        </div>

        {(backtestRequested || backtestLoading) && (
          <div className="gate-section-block">
            <div className="gate-section-block-header flex items-center justify-between gap-2">
              <span>90-day historical replay</span>
              {!backtestLoading && (
                <button type="button" className="gate-export-btn" onClick={onRunBacktest}>
                  Re-run
                </button>
              )}
            </div>
            <div className="gate-section-block-body space-y-3">
              {backtestLoading && (
                <div className="flex items-center gap-2 text-xs text-[var(--gate-muted)]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Replaying bars with same rule engine…
                </div>
              )}
              {!backtestLoading && backtest?.ok && backtest.equityCurves && (
                <>
                  {backtest.dataSource && (
                    <p className="rounded-lg border border-cyan-400/20 bg-cyan-500/8 px-2.5 py-2 font-mono text-[10px] text-cyan-100/90">
                      Replay source: {backtest.dataSource}
                      {backtest.bars ? ` · ${backtest.bars} bars` : ""}
                      {backtest.dataSource.includes("binance")
                        ? " — CMC historical unavailable on Basic tier; same rule engine on venue prices."
                        : " — CMC historical daily bars."}
                    </p>
                  )}
                  {backtest.note && <p className="text-xs text-[var(--gate-muted)]">{backtest.note}</p>}
                  {underperformed && backtest.compare && backtest.backtest && (
                    <p className="text-xs text-[var(--gate-muted)]">
                      Lower return vs naive agent this window — rules favor lower drawdown (
                      {backtest.backtest.maxDrawdownPct}% vs {backtest.compare.naiveAgent.maxDrawdownPct}%).
                    </p>
                  )}
                  <GateEquityChart points={backtest.equityCurves} symbol={selected.symbol} />
                </>
              )}
              {!backtestLoading && backtest && !backtest.ok && (
                <p className="text-xs text-cyan-200/80">
                  {backtest.error}
                  {backtest.hint ? ` — ${backtest.hint}` : ""}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="gate-code-block">
          <div className="gate-code-top">
            <span className="gate-code-lang">LIVE STRATEGY PSEUDOCODE</span>
            <button type="button" className="gate-export-btn" onClick={() => navigator.clipboard.writeText(pseudocode)}>
              Copy
            </button>
          </div>
          <pre className="gate-code-pre">{pseudocode}</pre>
        </div>
      </div>

      <div className="gate-export-bar">
        <a className="gate-export-btn primary" href={`${GITHUB_SKILL}/SKILL.md`} target="_blank" rel="noopener noreferrer">
          SKILL.md
        </a>
        <a className="gate-export-btn" href={`${GITHUB_SKILL}/STRATEGY_SPEC.md`} target="_blank" rel="noopener noreferrer">
          Strategy spec
        </a>
        <button type="button" className="gate-export-btn" onClick={onOpenNexus}>
          Open trade desk →
        </button>
        <button type="button" className="gate-export-btn" onClick={onRunBacktest}>
          {backtestRequested ? "Re-run replay" : "Run 90-day replay"}
        </button>
      </div>
    </div>
  );
}
