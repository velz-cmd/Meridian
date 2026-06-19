/** Dune Analytics API — BNB hack traction + PRISM macro context. */

export function hasDuneKey(): boolean {
  return Boolean(process.env.DUNE_API_KEY?.trim());
}

export type DunePublicConfig = {
  dashboardUrl: string | null;
  embedUrl: string | null;
  queryIds: number[];
};

function duneHeaders(): HeadersInit {
  return {
    Accept: "application/json",
    "X-DUNE-API-KEY": process.env.DUNE_API_KEY!.trim(),
  };
}

export type DuneQuerySnippet = {
  queryId: number;
  rowCount: number;
  sample: Record<string, unknown>;
};

export type DuneQueryResult = {
  queryId: number;
  rows: Array<Record<string, unknown>>;
  rowCount: number;
};

function parseQueryId(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw.trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Public dashboard + embed URLs for judges / application forms. */
export function getDunePublicConfig(): DunePublicConfig {
  const dashboardUrl =
    process.env.NEXT_PUBLIC_DUNE_DASHBOARD_URL?.trim() ||
    process.env.DUNE_DASHBOARD_URL?.trim() ||
    null;
  const embedUrl =
    process.env.NEXT_PUBLIC_DUNE_EMBED_URL?.trim() ||
    process.env.DUNE_EMBED_URL?.trim() ||
    null;

  const ids = [
    process.env.DUNE_BNB_STATS_QUERY_ID,
    process.env.DUNE_BNB_TX_QUERY_ID,
    process.env.DUNE_PRISM_QUERY_ID,
  ]
    .map((raw) => parseQueryId(raw ?? undefined))
    .filter((n): n is number => n != null);

  return { dashboardUrl, embedUrl, queryIds: [...new Set(ids)] };
}

export async function fetchDuneQueryResults(
  queryId: number,
  limit = 50,
): Promise<DuneQueryResult | null> {
  const key = process.env.DUNE_API_KEY?.trim();
  if (!key || !Number.isFinite(queryId)) return null;

  try {
    const res = await fetch(
      `https://api.dune.com/api/v1/query/${queryId}/results?limit=${limit}`,
      { headers: duneHeaders(), signal: AbortSignal.timeout(14_000), next: { revalidate: 120 } },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      result?: { rows?: Array<Record<string, unknown>> };
    };
    const rows = data.result?.rows ?? [];
    return { queryId, rows, rowCount: rows.length };
  } catch (e) {
    console.warn(`Dune query ${queryId} unavailable:`, e);
    return null;
  }
}

/** Flatten first row of stats query into metric map (snake_case keys). */
export function duneRowsToMetrics(rows: Array<Record<string, unknown>>): Record<string, number | string | null> {
  const out: Record<string, number | string | null> = {};
  for (const row of rows.slice(0, 5)) {
    for (const [k, v] of Object.entries(row)) {
      if (out[k] != null) continue;
      if (typeof v === "number" || typeof v === "string") out[k] = v;
      else if (v == null) out[k] = null;
    }
  }
  return out;
}

/** Latest rows from a saved Dune query (set DUNE_PRISM_QUERY_ID on Vercel). */
export async function fetchDunePrismSnippet(limit = 3): Promise<DuneQuerySnippet | null> {
  const rawId = process.env.DUNE_PRISM_QUERY_ID?.trim();
  const queryId = parseQueryId(rawId ?? undefined);
  if (!queryId) return null;

  const result = await fetchDuneQueryResults(queryId, limit);
  if (!result?.rows.length) return null;

  return { queryId, rowCount: result.rowCount, sample: result.rows[0]! };
}

/** BNB hack stats — prefers DUNE_BNB_STATS_QUERY_ID, falls back to PRISM query. */
export async function fetchDuneBnbAnalytics(limit = 25): Promise<{
  stats: DuneQueryResult | null;
  txs: DuneQueryResult | null;
  metrics: Record<string, number | string | null>;
}> {
  const statsId =
    parseQueryId(process.env.DUNE_BNB_STATS_QUERY_ID) ??
    parseQueryId(process.env.DUNE_PRISM_QUERY_ID);
  const txId = parseQueryId(process.env.DUNE_BNB_TX_QUERY_ID);

  const [stats, txs] = await Promise.all([
    statsId ? fetchDuneQueryResults(statsId, limit) : Promise.resolve(null),
    txId ? fetchDuneQueryResults(txId, Math.min(limit, 15)) : Promise.resolve(null),
  ]);

  const metrics = stats?.rows.length ? duneRowsToMetrics(stats.rows) : {};

  return { stats, txs, metrics };
}

export async function probeDune(): Promise<{
  ok: boolean;
  configured: boolean;
  queryConfigured: boolean;
  dashboardUrl: string | null;
  error?: string;
}> {
  const pub = getDunePublicConfig();
  if (!hasDuneKey()) {
    return {
      ok: false,
      configured: false,
      queryConfigured: false,
      dashboardUrl: pub.dashboardUrl,
      error: "DUNE_API_KEY not set",
    };
  }

  try {
    const res = await fetch("https://api.dune.com/api/v1/datasets?limit=1", {
      headers: duneHeaders(),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        configured: true,
        queryConfigured: pub.queryIds.length > 0,
        dashboardUrl: pub.dashboardUrl,
        error: "invalid key",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        configured: true,
        queryConfigured: pub.queryIds.length > 0,
        dashboardUrl: pub.dashboardUrl,
        error: `HTTP ${res.status}`,
      };
    }
    return {
      ok: true,
      configured: true,
      queryConfigured: pub.queryIds.length > 0,
      dashboardUrl: pub.dashboardUrl,
    };
  } catch (e) {
    return {
      ok: false,
      configured: true,
      queryConfigured: pub.queryIds.length > 0,
      dashboardUrl: pub.dashboardUrl,
      error: e instanceof Error ? e.message : "timeout",
    };
  }
}
