import { appendMeridianActivity } from "@/lib/meridian-activity-log";

export type PermitLogEntry = {
  permitId: string;
  symbol: string;
  status: "GRANT" | "DENY";
  agentAction: string | null;
  regime?: string;
  cmcLive: boolean;
  at: string;
};

const LOG_KEY = "meridian-permit-log-v1";
const MAX = 20;

export function appendPermitLog(entry: PermitLogEntry) {
  if (typeof window === "undefined") return;
  try {
    const prev = readPermitLog();
    const last = prev.find((e) => e.symbol === entry.symbol);
    if (
      last &&
      last.status === entry.status &&
      last.agentAction === entry.agentAction &&
      Date.now() - new Date(last.at).getTime() < 120_000
    ) {
      return;
    }
    const next = [entry, ...prev.filter((e) => e.permitId !== entry.permitId)].slice(0, MAX);
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
    appendMeridianActivity({
      kind: "permit",
      level: entry.status === "GRANT" ? "success" : "warn",
      message: `Constitution ${entry.status} · ${entry.symbol}${entry.regime ? ` · ${entry.regime}` : ""}`,
      symbol: entry.symbol,
    });
  } catch {
    /* private mode */
  }
}

export function readPermitLog(): PermitLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PermitLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
