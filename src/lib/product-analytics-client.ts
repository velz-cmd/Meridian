"use client";

/** Anonymous visitor + session IDs for product analytics. */
const VID_KEY = "meridian-vid";
const SID_KEY = "meridian-sid";

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getMeridianVisitorId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = localStorage.getItem(VID_KEY);
    if (!id) {
      id = uid();
      localStorage.setItem(VID_KEY, id);
    }
    return id;
  } catch {
    return uid();
  }
}

export function getMeridianSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem(SID_KEY);
    if (!id) {
      id = uid();
      sessionStorage.setItem(SID_KEY, id);
    }
    return id;
  } catch {
    return uid();
  }
}

export type MeridianTrackInput = {
  kind: string;
  path?: string;
  action?: string;
  symbol?: string;
  meta?: Record<string, unknown>;
};

export function trackMeridianEvent(input: MeridianTrackInput): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    visitor_id: getMeridianVisitorId(),
    session_id: getMeridianSessionId(),
    kind: input.kind,
    path: input.path ?? window.location.pathname,
    action: input.action ?? null,
    symbol: input.symbol ?? null,
    meta: input.meta ?? {},
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/track", blob);
      return;
    }
  } catch {
    /* fetch fallback */
  }

  void fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}
