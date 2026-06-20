"use client";

import { BookOpen, TrendingDown, TrendingUp } from "lucide-react";
import { GateCollapsibleCard, GateStatPill } from "@/components/gate/gate-collapsible-card";
import type { MeridianTradeJournal } from "@/lib/meridian-trade-journal";
import type { MeridianTradeAutopsy } from "@/lib/meridian-intelligence-types";

export function GateTradeJournalPanel({
  journal,
  autopsies,
}: {
  journal: MeridianTradeJournal | null;
  autopsies: MeridianTradeAutopsy[];
}) {
  if (!journal) return null;

  const hasStats =
    journal.sampleSize > 0 || journal.replayWinRatePct != null || autopsies.length > 0;

  return (
    <div className="space-y-4">
      <GateCollapsibleCard
        title="Trade journal"
        question="Accountability · after every trade"
        icon={BookOpen}
        defaultOpen={journal.sampleSize >= 3}
        summary={
          journal.sampleSize >= 3
            ? `${journal.sampleSize} closed trades · win rate ${journal.winRatePct}% · avg winner ${journal.avgWinnerPct != null ? `+${journal.avgWinnerPct}%` : "—"} · avg loser ${journal.avgLoserPct}%`
            : journal.replayWinRatePct != null
              ? `90-day replay · ${journal.replayWinRatePct}% win rate · ${journal.replayReturnPct}% return (constitution proof until wallet history builds)`
              : "Complete trades on NEXUS to populate accountable statistics"
        }
      >
        <p className="mb-4 text-xs leading-relaxed text-white/45">{journal.disclaimer}</p>

        {hasStats ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <GateStatPill
                label="Win rate"
                value={
                  journal.winRatePct != null
                    ? `${journal.winRatePct}%`
                    : journal.replayWinRatePct != null
                      ? `${journal.replayWinRatePct}%*`
                      : "—"
                }
                sub={journal.sampleSize ? `${journal.sampleSize} closed` : "*90-day replay"}
              />
              <GateStatPill
                label="Avg winner"
                value={journal.avgWinnerPct != null ? `+${journal.avgWinnerPct}%` : "—"}
                sub="Realized round-trips"
              />
              <GateStatPill
                label="Avg loser"
                value={journal.avgLoserPct != null ? `${journal.avgLoserPct}%` : "—"}
                sub="Losses shown, not hidden"
              />
              <GateStatPill
                label="Max drawdown"
                value={
                  journal.maxDrawdownPct != null
                    ? `${journal.maxDrawdownPct}%`
                    : journal.replayDrawdownPct != null
                      ? `${journal.replayDrawdownPct}%`
                      : "—"
                }
                sub="Replay or live journal"
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs text-white/45">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400/80" />
                  Best environment
                </div>
                <p className="text-sm font-semibold capitalize text-white">
                  {journal.bestEnvironment?.replace(/-/g, " ") ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs text-white/45">
                  <TrendingDown className="h-3.5 w-3.5 text-rose-400/80" />
                  Weakest environment
                </div>
                <p className="text-sm font-semibold capitalize text-white">
                  {journal.weakestEnvironment?.replace(/-/g, " ") ?? "—"}
                </p>
              </div>
            </div>

            {(journal.mostReliableSkill || journal.leastReliableSkill) && (
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3 text-sm">
                <p className="text-white/70">
                  Most reliable skill:{" "}
                  <span className="font-semibold text-emerald-200/90">
                    {journal.mostReliableSkill ?? "—"}
                  </span>
                </p>
                <p className="mt-1 text-white/70">
                  Least reliable skill:{" "}
                  <span className="font-semibold text-amber-200/90">
                    {journal.leastReliableSkill ?? "—"}
                  </span>
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-white/50">
            No closed trades yet. MERIDIAN publishes win rate and drawdown only from real history —
            never fabricated accuracy.
          </p>
        )}
      </GateCollapsibleCard>

      {autopsies.length > 0 && (
        <GateCollapsibleCard
          title="Trade autopsy"
          question="What succeeded · what failed · why"
          icon={BookOpen}
          defaultOpen={autopsies.some((a) => a.outcome === "loss")}
          summary={`${autopsies.length} recent trade${autopsies.length === 1 ? "" : "s"} reviewed · lessons from live wallet history`}
        >
          <ul className="space-y-3">
            {autopsies.map((t) => (
              <li
                key={t.tradeId}
                className="rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-white/45">{t.tradeId.slice(0, 8)}</span>
                  <span
                    className={
                      t.outcome === "win"
                        ? "text-emerald-300"
                        : t.outcome === "loss"
                          ? "text-rose-300"
                          : "text-white/55"
                    }
                  >
                    {t.outcome.toUpperCase()}
                    {t.actualPnlUsd != null ? ` · $${t.actualPnlUsd.toFixed(2)}` : ""}
                  </span>
                </div>
                <p className="mt-2 text-white/75">{t.lesson}</p>
                {t.failedSkills.length > 0 && (
                  <p className="mt-1 text-xs text-rose-200/75">Failed layers: {t.failedSkills.join(", ")}</p>
                )}
                <p className="mt-2 text-xs text-white/45">{t.suggestedImprovement}</p>
              </li>
            ))}
          </ul>
        </GateCollapsibleCard>
      )}
    </div>
  );
}
