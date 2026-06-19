/**
 * MERIDIAN product analytics — real visits, actions, API usage.
 * Persists to Supabase product_events; falls back to .data/product-events.json locally.
 */
import { createHash, randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getSupabase } from "@/lib/supabase";

export type ProductEventInput = {
  visitor_id: string;
  session_id?: string | null;
  kind: string;
  path?: string | null;
  action?: string | null;
  symbol?: string | null;
  meta?: Record<string, unknown>;
};

export type ProductEventRow = ProductEventInput & {
  id: string;
  created_at: string;
};

export type ProductAnalyticsStats = {
  configured: boolean;
  storage: "supabase" | "local" | "none";
  visitors24h: number;
  visitors7d: number;
  visitorsAllTime: number;
  pageViews24h: number;
  pageViews7d: number;
  actions24h: number;
  activeVisitors1h: number;
  sessions24h: number;
  topPages: { path: string; views: number }[];
  topActions: { kind: string; count: number }[];
  hourlyPageViews: { hour: string; count: number }[];
  recent: Array<{
    at: string;
    kind: string;
    path: string | null;
    action: string | null;
    symbol: string | null;
    visitorShort: string;
  }>;
  derived: {
    demoWallets: number;
    totalDemoTrades: number;
    nexusDecisions: number;
    prismPredictions: number;
  };
};

const LOCAL_PATH = path.join(process.cwd(), ".data", "product-events.json");
const LOCAL_MAX = 5000;

function shortVisitor(id: string): string {
  if (id.startsWith("server:")) return "api";
  return id.length > 8 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
}

function hashVisitorFromRequest(request: Request): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ua = request.headers.get("user-agent") ?? "";
  return `server:${createHash("sha256").update(`${ip}|${ua.slice(0, 80)}`).digest("hex").slice(0, 16)}`;
}

export function visitorIdFromRequest(request: Request): string {
  return hashVisitorFromRequest(request);
}

async function readLocalEvents(): Promise<ProductEventRow[]> {
  try {
    const raw = await readFile(LOCAL_PATH, "utf8");
    const parsed = JSON.parse(raw) as ProductEventRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function appendLocalEvent(row: ProductEventRow): Promise<void> {
  const prev = await readLocalEvents();
  const next = [row, ...prev].slice(0, LOCAL_MAX);
  await mkdir(path.dirname(LOCAL_PATH), { recursive: true });
  await writeFile(LOCAL_PATH, JSON.stringify(next));
}

export async function recordProductEvent(input: ProductEventInput): Promise<void> {
  const row: ProductEventRow = {
    ...input,
    id: randomUUID(),
    created_at: new Date().toISOString(),
    session_id: input.session_id ?? null,
    path: input.path ?? null,
    action: input.action ?? null,
    symbol: input.symbol ?? null,
    meta: input.meta ?? {},
  };

  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from("product_events").insert({
      visitor_id: row.visitor_id,
      session_id: row.session_id,
      kind: row.kind,
      path: row.path,
      action: row.action,
      symbol: row.symbol,
      meta: row.meta,
    });
    if (!error) return;
    if (!error.message.includes("does not exist") && !error.message.includes("schema cache")) {
      console.warn("product_events insert:", error.message);
    }
  }

  try {
    await appendLocalEvent(row);
  } catch {
    /* ephemeral */
  }
}

/** Fire-and-forget server-side event from API routes. */
export function trackServerProductEvent(
  request: Request,
  kind: string,
  extra?: { path?: string; action?: string; symbol?: string; meta?: Record<string, unknown> },
): void {
  void recordProductEvent({
    visitor_id: visitorIdFromRequest(request),
    kind,
    path: extra?.path ?? new URL(request.url).pathname,
    action: extra?.action ?? null,
    symbol: extra?.symbol ?? null,
    meta: extra?.meta,
  });
}

function aggregateEvents(rows: ProductEventRow[]): Omit<ProductAnalyticsStats, "configured" | "storage" | "derived"> {
  const now = Date.now();
  const h24 = now - 86_400_000;
  const h7d = now - 7 * 86_400_000;
  const h1h = now - 3_600_000;

  const visitors24 = new Set<string>();
  const visitors7d = new Set<string>();
  const visitorsAll = new Set<string>();
  const sessions24 = new Set<string>();
  const active1h = new Set<string>();
  const pageCounts = new Map<string, number>();
  const actionCounts = new Map<string, number>();
  const hourBuckets = new Map<string, number>();

  let pageViews24h = 0;
  let pageViews7d = 0;
  let actions24h = 0;

  for (const row of rows) {
    const t = new Date(row.created_at).getTime();
    visitorsAll.add(row.visitor_id);
    if (t >= h7d) {
      visitors7d.add(row.visitor_id);
      if (row.kind === "page_view") pageViews7d += 1;
      else actionCounts.set(row.kind, (actionCounts.get(row.kind) ?? 0) + 1);
    }
    if (t >= h24) {
      visitors24.add(row.visitor_id);
      if (row.session_id) sessions24.add(row.session_id);
      if (row.kind === "page_view") {
        pageViews24h += 1;
        const p = row.path ?? "/";
        pageCounts.set(p, (pageCounts.get(p) ?? 0) + 1);
        const hour = new Date(row.created_at).toISOString().slice(0, 13);
        hourBuckets.set(hour, (hourBuckets.get(hour) ?? 0) + 1);
      } else {
        actions24h += 1;
      }
    }
    if (t >= h1h) active1h.add(row.visitor_id);
  }

  const topPages = [...pageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([path, views]) => ({ path, views }));

  const topActions = [...actionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([kind, count]) => ({ kind, count }));

  const hourlyPageViews: { hour: string; count: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now - i * 3_600_000);
    const key = d.toISOString().slice(0, 13);
    hourlyPageViews.push({
      hour: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
      count: hourBuckets.get(key) ?? 0,
    });
  }

  const recent = rows.slice(0, 30).map((r) => ({
    at: r.created_at,
    kind: r.kind,
    path: r.path ?? null,
    action: r.action ?? null,
    symbol: r.symbol ?? null,
    visitorShort: shortVisitor(r.visitor_id),
  }));

  return {
    visitors24h: visitors24.size,
    visitors7d: visitors7d.size,
    visitorsAllTime: visitorsAll.size,
    pageViews24h,
    pageViews7d,
    actions24h,
    activeVisitors1h: active1h.size,
    sessions24h: sessions24.size,
    topPages,
    topActions,
    hourlyPageViews,
    recent,
  };
}

async function fetchSupabaseEvents(sinceIso: string, limit = 8000): Promise<ProductEventRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("product_events")
    .select("id, created_at, visitor_id, session_id, kind, path, action, symbol, meta")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (!error.message.includes("does not exist")) {
      console.warn("product_events read:", error.message);
    }
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id as string,
    created_at: r.created_at as string,
    visitor_id: r.visitor_id as string,
    session_id: (r.session_id as string | null) ?? null,
    kind: r.kind as string,
    path: (r.path as string | null) ?? null,
    action: (r.action as string | null) ?? null,
    symbol: (r.symbol as string | null) ?? null,
    meta: (r.meta as Record<string, unknown>) ?? {},
  }));
}

async function fetchDerivedCounts(): Promise<ProductAnalyticsStats["derived"]> {
  const supabase = getSupabase();
  let demoWallets = 0;
  let totalDemoTrades = 0;
  let nexusDecisions = 0;
  let prismPredictions = 0;

  if (supabase) {
    const [portfolios, nx, pr] = await Promise.all([
      supabase.from("demo_portfolios").select("trades"),
      supabase.from("nexus_decisions").select("*", { count: "exact", head: true }),
      supabase.from("prism_predictions").select("*", { count: "exact", head: true }),
    ]);
    if (portfolios.data) {
      demoWallets = portfolios.data.length;
      for (const row of portfolios.data) {
        totalDemoTrades += ((row.trades as unknown[]) ?? []).length;
      }
    }
    nexusDecisions = nx.count ?? 0;
    prismPredictions = pr.count ?? 0;
  }

  return { demoWallets, totalDemoTrades, nexusDecisions, prismPredictions };
}

export async function getProductAnalyticsStats(): Promise<ProductAnalyticsStats> {
  const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();
  let rows = await fetchSupabaseEvents(since7d);
  let storage: ProductAnalyticsStats["storage"] = rows.length > 0 ? "supabase" : "none";

  if (rows.length === 0) {
    const local = await readLocalEvents();
    if (local.length > 0) {
      rows = local.filter((r) => new Date(r.created_at).getTime() >= Date.parse(since7d));
      storage = "local";
    }
  } else {
    storage = "supabase";
  }

  const derived = await fetchDerivedCounts();
  const agg = aggregateEvents(rows);

  return {
    configured: Boolean(getSupabase()) || storage === "local",
    storage,
    ...agg,
    derived,
  };
}
