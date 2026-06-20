"use client";

import type { GateSignalRow } from "@/lib/gate-signal-meter";
import { cn } from "@/lib/utils";

export function GateSignalMeter({
  rows,
  verdict,
  verdictConfidence,
}: {
  rows: GateSignalRow[];
  verdict: string;
  verdictConfidence: number | null;
}) {
  const chipClass =
    verdict === "LONG" ? "green" : verdict === "EXIT" || verdict === "AVOID" ? "red" : "accent";
  const confLabel = verdictConfidence != null ? `${verdictConfidence}%` : "—";

  return (
    <div className="gate-signal-block">
      <div className="gate-signal-block-header">
        <span className="gate-signal-block-title">Live signal composite</span>
        <span className={cn("gate-meta-chip", chipClass)}>
          {verdict} · {confLabel}
        </span>
      </div>
      <div className="gate-signal-block-body">
        {rows.map((sig) => {
          const pct = sig.value != null ? Math.min((sig.value / sig.max) * 100, 100) : 0;
          const col = sig.bull ? "var(--gate-green)" : "var(--gate-red)";
          return (
            <div key={sig.name} className="gate-signal-row">
              <span className="gate-signal-name">{sig.name}</span>
              <div className="gate-signal-bar-bg">
                <div className="gate-signal-bar" style={{ width: `${pct}%`, background: col }} />
              </div>
              <span className="gate-signal-val" style={{ color: col }}>
                {sig.value ?? "—"}
              </span>
              <span
                className="gate-signal-dir"
                style={{ color: col, background: sig.bull ? "var(--gate-green-dim)" : "var(--gate-red-dim)" }}
              >
                {sig.direction}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
