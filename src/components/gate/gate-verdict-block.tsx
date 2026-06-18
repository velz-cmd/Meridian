"use client";

import { gateVerdictFromSignal } from "@/lib/gate-signal-meter";

export function GateVerdictBlock({
  signal,
  confidence,
  regime,
  thesis,
}: {
  signal: string;
  confidence: number;
  regime?: string;
  thesis?: string;
}) {
  const { label, reason } = gateVerdictFromSignal(signal);
  const color =
    label === "LONG"
      ? "var(--gate-green)"
      : label === "EXIT" || label === "AVOID"
        ? "var(--gate-red)"
        : "#67e8f9";
  const bg =
    label === "LONG"
      ? "var(--gate-green-dim)"
      : label === "EXIT" || label === "AVOID"
        ? "var(--gate-red-dim)"
        : "rgba(34, 211, 238, 0.1)";
  const icon = label === "LONG" ? "●" : label === "EXIT" ? "■" : label === "AVOID" ? "▲" : "○";

  return (
    <div className="gate-verdict-block">
      <div className="gate-section-block-header">Strategy verdict · this bar</div>
      <div className="gate-verdict-body">
        <div className="gate-verdict-main" style={{ background: bg, borderColor: `${color}33` }}>
          <span className="gate-verdict-icon" style={{ color }}>
            {icon}
          </span>
          <div>
            <p className="gate-verdict-label" style={{ color }}>
              {label}
            </p>
            <p className="gate-verdict-conf">
              Confidence {confidence}% · {(regime ?? "unknown").replace(/-/g, " ")} regime
            </p>
            <p className="gate-verdict-reason">{thesis ?? reason}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
