import type { GateJudgeConsensus } from "@/lib/gate-consensus-payload";

export type GatePermitStatus = "GRANT" | "DENY" | "WAIT";

/** Single permit source for Gate surfaces — judge consensus from skills API. */
export function resolveGatePermitStatus(
  judgeConsensus: GateJudgeConsensus | null | undefined,
): GatePermitStatus {
  const status = judgeConsensus?.permit.status;
  if (status === "GRANT" || status === "DENY" || status === "WAIT") return status;
  return "WAIT";
}
