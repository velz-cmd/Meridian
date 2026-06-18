export type ActivityKind = "permit" | "trade" | "gate" | "system";
export type ActivityLevel = "info" | "success" | "warn" | "error";

export type MeridianActivityEntry = {
  id: string;
  at: string;
  kind: ActivityKind;
  level: ActivityLevel;
  message: string;
  symbol?: string;
  txHash?: string;
};

const LOG_KEY = "meridian-activity-log-v1";
const MAX = 30;
export const ACTIVITY_EVENT = "meridian-activity";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readMeridianActivityLog(): MeridianActivityEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MeridianActivityEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendMeridianActivity(
  entry: Omit<MeridianActivityEntry, "id" | "at"> & { at?: string; id?: string },
) {
  if (typeof window === "undefined") return;
  try {
    const prev = readMeridianActivityLog();
    const at = entry.at ?? new Date().toISOString();
    const last = prev[0];
    const dedupeMs = entry.kind === "gate" ? 300_000 : 8_000;
    const gateDup =
      entry.kind === "gate" &&
      last?.kind === "gate" &&
      entry.symbol &&
      last.symbol === entry.symbol &&
      last.message.startsWith("Gate ranked") &&
      entry.message.startsWith("Gate ranked");
    if (
      last &&
      ((last.message === entry.message && last.kind === entry.kind) || gateDup) &&
      Date.now() - new Date(last.at).getTime() < dedupeMs
    ) {
      return;
    }
    const row: MeridianActivityEntry = {
      id: entry.id ?? uid(),
      at,
      kind: entry.kind,
      level: entry.level,
      message: entry.message,
      symbol: entry.symbol,
      txHash: entry.txHash,
    };
    const next = [row, ...prev].slice(0, MAX);
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(ACTIVITY_EVENT));
  } catch {
    /* private mode */
  }
}

export function seedMeridianActivityIfEmpty() {
  if (typeof window === "undefined") return;
  if (readMeridianActivityLog().length > 0) return;
  appendMeridianActivity({
    kind: "system",
    level: "info",
    message: "MERIDIAN pipeline online — waiting for gate scan…",
  });
}
