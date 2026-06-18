"use client";

import { Loader2 } from "lucide-react";
import {
  CHECK_PSEUDOCODE,
  EXIT_PSEUDOCODE,
  buildStrategyPseudocode,
  checkRuleKind,
  type RuleCardKind,
} from "@/lib/gate-rule-pseudocode";
import {
  GATE_STRATEGY_NAME,
  GATE_STRATEGY_TAGLINE,
  STRATEGY_EXIT_RULES,
  GITHUB_SKILL,
  strategyPosition,
  strategySignalLabel,
} from "@/lib/gate-strategy-copy";
import { GateEquityChart } from "@/components/gate/gate-equity-chart";
import type { GateBenchmarkFull } from "@/lib/gate-route-types";
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

export function GateOutputPanel({
  selected,
  skills,
  loading,
  backtest,
  backtestLoading,
  backtestRequested,
  onRunBacktest,
  onOpenNexus,
}: {
  selected?: GateBenchmarkFull;
  skills?: GateSkillsPayload | null;
  loading?: boolean;
  backtest: BacktestPayload | null;
  backtestLoading: boolean;
  backtestRequested: boolean;
  onRunBacktest: () => void;
  onOpenNexus: () => void;
}) {
  if (loading && !selected) {
    return (
      <div className="gate-output-panel">
        <div className="gate-output-empty">
          <div className="gate-loading-bars">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="gate-loading-bar" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <p className="font-mono text-xs">Applying live CMC rules…</p>
        </div>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="gate-output-panel">
        <div className="gate-output-empty">
          <p className="text-sm">Select a benchmark on the left — output updates from the live rule engine.</p>
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

  const regimeRows = [
    {
      label: skills?.regime.regime?.replace(/-/g, " ") ?? gate.regime?.replace(/-/g, " ") ?? "Neutral",
      action: skills?.regime.positioning ?? "Hold flat unless tier clears",
      color: "#F5A623",
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
              <span className="gate-meta-chip amber">{gate.tier.toUpperCase()}</span>
              <span className={cn("gate-meta-chip", long ? "green" : "")}>{position}</span>
              <span className="gate-meta-chip">{strategySignalLabel(displaySignal)}</span>
              {selected.cmcLive && <span className="gate-meta-chip green">CMC live</span>}
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
          </div>
          <div className="gate-stat-card">
            <p className="gate-stat-label">24h</p>
            <p className={cn("gate-stat-value", selected.market.change24h >= 0 ? "green" : "red")}>
              {selected.market.change24h >= 0 ? "+" : ""}
              {selected.market.change24h.toFixed(2)}%
            </p>
          </div>
          <div className="gate-stat-card">
            <p className="gate-stat-label">Checks</p>
            <p className="gate-stat-value amber">
              {gate.checksPassed}/{gate.checksTotal}
            </p>
          </div>
          <div className="gate-stat-card">
            <p className="gate-stat-label">Edge</p>
            <p className="gate-stat-value green">+{gate.edge ?? 0}</p>
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
                <p className="gate-stat-value amber">
                  {backtest.compare?.edge.returnDeltaPct != null
                    ? `${backtest.compare.edge.returnDeltaPct >= 0 ? "+" : ""}${backtest.compare.edge.returnDeltaPct}%`
                    : "—"}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="gate-section-block">
          <div className="gate-section-block-header">Live rule checks · this bar</div>
          <div className="gate-section-block-body">
            <div className="gate-rule-list">
              {checks.map((c) => (
                <RuleCard
                  key={c.id}
                  kind={checkRuleKind(c.id)}
                  condition={c.label}
                  code={CHECK_PSEUDOCODE[c.id] ?? c.id}
                  pass={c.pass}
                />
              ))}
            </div>
            <p className="mt-3 font-mono text-[10px] text-[var(--gate-muted)]">
              Agreement {agreementPct}% · deterministic · no LLM in signal path
            </p>
          </div>
        </div>

        <div className="gate-section-block">
          <div className="gate-section-block-header">Exit conditions · constitution</div>
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
            </div>
          </div>
        </div>

        <div className="gate-section-block">
          <div className="gate-section-block-header">Market regime map</div>
          <div className="gate-section-block-body">
            {regimeRows.map((r) => (
              <div key={r.label} className="gate-regime-row">
                <div className="gate-regime-dot" style={{ background: r.color }} />
                <span className="flex-1 font-medium">{r.label}</span>
                <span className="font-mono text-[11px]" style={{ color: r.color }}>
                  {r.action}
                </span>
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
                  {backtest.note && (
                    <p className="text-xs text-[var(--gate-muted)]">{backtest.note}</p>
                  )}
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
                <p className="text-xs text-[var(--gate-amber)]">
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
        <a className="gate-export-btn" href={`${GITHUB_SKILL}/SKILL.md`} target="_blank" rel="noopener noreferrer">
          SKILL.md
        </a>
        <a className="gate-export-btn" href={`${GITHUB_SKILL}/STRATEGY_SPEC.md`} target="_blank" rel="noopener noreferrer">
          Strategy spec
        </a>
        <button type="button" className="gate-export-btn" onClick={onOpenNexus}>
          Open trade desk →
        </button>
      </div>
    </div>
  );
}
