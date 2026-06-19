/**
 * MERIDIAN product analytics — visits, wallet connects, actions, all-time stats.
 * Persists to Supabase (product_events + connected_wallets); local JSON fallback for dev.
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

export type ProductWalletStats = {
  connectedAllTime: number;
  connected24h: number;
  connected7d: number;
  tradingWallets: number;
  vaultWallets: number;
  recentConnects: Array<{ wallet: string; at: string; path: string | null; connects: number }>;
};

export type ProductAllTimeStats = {
  pageViews: number;
  visitors: number;
  actions: number;
  walletConnectEvents: number;
  trades: number;
  nexusDecisions: number;
  prismPredictions: number;
  gateApiCalls: number;
};

export type ProductDailyTrend = {
  date: string;
  pageViews: number;
  visitors: number;
  walletConnects: number;
  actions: number;
};

export type ProductAnalyticsStats = {
  configured: boolean;
  storage: "supabase" | "local" | "none";
  tableReady: boolean;
  siteLiveSince: string | null;
  visitors24h: number;
  visitors7d: number;
  visitorsAllTime: number;
  pageViews24h: number;
  pageViews7d: number;
  pageViewsAllTime: number;
  actions24h: number;
  actionsAllTime: number;
  activeVisitors1h: number;
  sessions24h: number;
  topPages: { path: string; views: number }[];
  topActions: { kind: string; count: number }[];
  hourlyPageViews: { hour: string; count: number }[];
  dailyTrend: ProductDailyTrend[];
  recent: Array<{
    at: string;
    kind: string;
    path: string | null;
    action: string | null;
    symbol: string | null;
    wallet: string | null;
    visitorShort: string;
  }>;
  wallets: ProductWalletStats;
  allTime: ProductAllTimeStats;
  derived: {
    demoWallets: number;
    totalDemoTrades: number;
    nexusDecisions: number;
    prismPredictions: number;
  };
};

const LOCAL_PATH = path.join(process.cwd(), ".data", "product-events.json");
const LOCAL_MAX = 20_000;
const SITE_LAUNCH =
  process.env.NEXT_PUBLIC_SITE_LAUNCH_DATE?.trim() ||
  process.env.SITE_LAUNCH_DATE?.trim() ||
  null;

function shortVisitor(id: string): string {
  if (id.startsWith("server:")) return "api";
  return id.length > 8 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
}

function shortWallet(w: string): string {
  const x = w.toLowerCase();
  return x.length > 12 ? `${x.slice(0, 6)}…${x.slice(-4)}` : x;
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

async function probeProductEventsTable(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("product_events").select("id").limit(1);
  if (!error) return true;
  const msg = error.message ?? "";
  return !msg.includes("does not exist") && !msg.includes("schema cache");
}

export async function recordWalletConnect(wallet: string, eventPath?: string | null): Promise<void> {
  const key = wallet.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(key)) return;

  const supabase = getSupabase();
  if (!supabase) return;

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("connected_wallets")
    .select("connect_count")
    .eq("wallet", key)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("connected_wallets")
      .update({
        last_seen: now,
        connect_count: (existing.connect_count as number) + 1,
        last_path: eventPath ?? null,
      })
      .eq("wallet", key);
  } else {
    await supabase.from("connected_wallets").insert({
      wallet: key,
      first_seen: now,
      last_seen: now,
      connect_count: 1,
      last_path: eventPath ?? null,
    });
  }
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

  if (input.kind === "nexus_wallet_connect") {
    const wallet = String(input.meta?.wallet ?? input.action ?? "").toLowerCase();
    if (wallet.startsWith("0x")) {
      void recordWalletConnect(wallet, input.path);
    }
  }

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
    /* ephemeral on Vercel */
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

type RpcCounts = {
  total_events?: number;
  unique_visitors?: number;
  page_views_all?: number;
  actions_all?: number;
  wallet_connect_events?: number;
  first_event_at?: string | null;
};

async function fetchRpcCounts(): Promise<RpcCounts | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("meridian_analytics_counts");
  if (error) return null;
  return (data ?? null) as RpcCounts | null;
}

function aggregateEvents(
  rows: ProductEventRow[],
  rpc: RpcCounts | null,
): {
  stats: Omit<
    ProductAnalyticsStats,
    "configured" | "storage" | "tableReady" | "siteLiveSince" | "wallets" | "allTime" | "derived"
  >;
  gateApiCalls: number;
} {
  const now = Date.now();
  const h24 = now - 86_400_000;
  const h7d = now - 7 * 86_400_000;
  const h30d = now - 30 * 86_400_000;
  const h1h = now - 3_600_000;

  const visitors24 = new Set<string>();
  const visitors7d = new Set<string>();
  const visitorsAll = new Set<string>();
  const sessions24 = new Set<string>();
  const active1h = new Set<string>();
  const pageCounts = new Map<string, number>();
  const actionCounts = new Map<string, number>();
  const hourBuckets = new Map<string, number>();
  const dailyMap = new Map<string, { pageViews: number; visitors: Set<string>; walletConnects: number; actions: number }>();

  let pageViews24h = 0;
  let pageViews7d = 0;
  let actions24h = 0;
  let gateApiCalls = 0;

  for (const row of rows) {
    const t = new Date(row.created_at).getTime();
    const dayKey = row.created_at.slice(0, 10);
    if (!dailyMap.has(dayKey)) {
      dailyMap.set(dayKey, { pageViews: 0, visitors: new Set(), walletConnects: 0, actions: 0 });
    }
    const day = dailyMap.get(dayKey)!;

    visitorsAll.add(row.visitor_id);
    if (t >= h30d) day.visitors.add(row.visitor_id);

    if (row.kind.startsWith("api_gate")) gateApiCalls += 1;

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

    if (t >= h30d) {
      if (row.kind === "page_view") {
        day.pageViews += 1;
      } else {
        day.actions += 1;
        if (row.kind === "nexus_wallet_connect") day.walletConnects += 1;
      }
    }
  }

  const topPages = [...pageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([p, views]) => ({ path: p, views }));

  const topActions = [...actionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
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

  const dailyTrend: ProductDailyTrend[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    const bucket = dailyMap.get(key);
    dailyTrend.push({
      date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      pageViews: bucket?.pageViews ?? 0,
      visitors: bucket?.visitors.size ?? 0,
      walletConnects: bucket?.walletConnects ?? 0,
      actions: bucket?.actions ?? 0,
    });
  }

  const recent = rows.slice(0, 40).map((r) => {
    const walletRaw = r.meta?.wallet;
    const wallet =
      typeof walletRaw === "string" && walletRaw.startsWith("0x")
        ? shortWallet(walletRaw)
        : r.kind === "nexus_trade" && r.action
          ? null
          : null;
    return {
      at: r.created_at,
      kind: r.kind,
      path: r.path ?? null,
      action: r.action ?? null,
      symbol: r.symbol ?? null,
      wallet,
      visitorShort: shortVisitor(r.visitor_id),
    };
  });

  return {
    stats: {
      visitors24h: visitors24.size,
      visitors7d: visitors7d.size,
      visitorsAllTime: rpc?.unique_visitors ?? visitorsAll.size,
      pageViews24h,
      pageViews7d,
      pageViewsAllTime: rpc?.page_views_all ?? rows.filter((r) => r.kind === "page_view").length,
      actions24h,
      actionsAllTime: rpc?.actions_all ?? rows.filter((r) => r.kind !== "page_view").length,
      activeVisitors1h: active1h.size,
      sessions24h: sessions24.size,
      topPages,
      topActions,
      hourlyPageViews,
      dailyTrend,
      recent,
    },
    gateApiCalls,
  };
}

async function fetchSupabaseEvents(sinceIso: string, limit = 15_000): Promise<ProductEventRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("product_events")
    .select("id, created_at, visitor_id, session_id, kind, path, action, symbol, meta")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];

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

async function fetchWalletStats(): Promise<ProductWalletStats> {
  const supabase = getSupabase();
  const empty: ProductWalletStats = {
    connectedAllTime: 0,
    connected24h: 0,
    connected7d: 0,
    tradingWallets: 0,
    vaultWallets: 0,
    recentConnects: [],
  };
  if (!supabase) return empty;

  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [connected, connected24, connected7, portfolios, vaults] = await Promise.all([
    supabase.from("connected_wallets").select("wallet, first_seen, last_seen, connect_count, last_path", {
      count: "exact",
    }),
    supabase
      .from("connected_wallets")
      .select("wallet", { count: "exact", head: true })
      .gte("last_seen", dayAgo),
    supabase
      .from("connected_wallets")
      .select("wallet", { count: "exact", head: true })
      .gte("last_seen", weekAgo),
    supabase.from("demo_portfolios").select("wallet"),
    supabase.from("agent_vault_ledgers").select("wallet", { count: "exact", head: true }),
  ]);

  const recentConnects = (connected.data ?? [])
    .sort((a, b) => new Date(b.last_seen as string).getTime() - new Date(a.last_seen as string).getTime())
    .slice(0, 12)
    .map((r) => ({
      wallet: shortWallet(r.wallet as string),
      at: r.last_seen as string,
      path: (r.last_path as string | null) ?? null,
      connects: r.connect_count as number,
    }));

  const tradingSet = new Set((portfolios.data ?? []).map((r) => (r.wallet as string).toLowerCase()));
  for (const r of connected.data ?? []) {
    tradingSet.add((r.wallet as string).toLowerCase());
  }

  return {
    connectedAllTime: connected.count ?? connected.data?.length ?? 0,
    connected24h: connected24.count ?? 0,
    connected7d: connected7.count ?? 0,
    tradingWallets: tradingSet.size,
    vaultWallets: vaults.count ?? 0,
    recentConnects,
  };
}

async function fetchDerivedCounts(): Promise<{
  derived: ProductAnalyticsStats["derived"];
  earliestDates: string[];
  totalTrades: number;
  gateApiFromEvents: number;
}> {
  const supabase = getSupabase();
  let demoWallets = 0;
  let totalDemoTrades = 0;
  let nexusDecisions = 0;
  let prismPredictions = 0;
  const earliestDates: string[] = [];

  if (supabase) {
    const [portfolios, nx, pr, nxFirst, prFirst] = await Promise.all([
      supabase.from("demo_portfolios").select("wallet, updated_at, trades"),
      supabase.from("nexus_decisions").select("*", { count: "exact", head: true }),
      supabase.from("prism_predictions").select("*", { count: "exact", head: true }),
      supabase.from("nexus_decisions").select("created_at").order("created_at", { ascending: true }).limit(1),
      supabase.from("prism_predictions").select("created_at").order("created_at", { ascending: true }).limit(1),
    ]);

    if (portfolios.data) {
      demoWallets = portfolios.data.length;
      for (const row of portfolios.data) {
        const trades = (row.trades as Array<{ timestamp?: string }>) ?? [];
        totalDemoTrades += trades.length;
        if (row.updated_at) earliestDates.push(row.updated_at as string);
        for (const t of trades) {
          if (t.timestamp) earliestDates.push(t.timestamp);
        }
      }
    }
    nexusDecisions = nx.count ?? 0;
    prismPredictions = pr.count ?? 0;
    if (nxFirst.data?.[0]?.created_at) earliestDates.push(nxFirst.data[0].created_at as string);
    if (prFirst.data?.[0]?.created_at) earliestDates.push(prFirst.data[0].created_at as string);
  }

  return {
    derived: { demoWallets, totalDemoTrades, nexusDecisions, prismPredictions },
    earliestDates,
    totalTrades: totalDemoTrades,
    gateApiFromEvents: 0,
  };
}

export async function getProductAnalyticsStats(): Promise<ProductAnalyticsStats> {
  const tableReady = await probeProductEventsTable();
  const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [rpc, rowsFromDb, local, wallets, derivedBundle] = await Promise.all([
    fetchRpcCounts(),
    tableReady ? fetchSupabaseEvents(since30d) : Promise.resolve([]),
    readLocalEvents(),
    fetchWalletStats(),
    fetchDerivedCounts(),
  ]);

  let rows = rowsFromDb;
  let storage: ProductAnalyticsStats["storage"] = "none";

  if (tableReady) {
    storage = "supabase";
  } else if (local.length > 0) {
    rows = local.filter((r) => new Date(r.created_at).getTime() >= Date.parse(since30d));
    storage = "local";
  }

  const { stats: agg, gateApiCalls } = aggregateEvents(rows, rpc);

  const siteDates = [...derivedBundle.earliestDates];
  if (rpc?.first_event_at) siteDates.push(rpc.first_event_at);
  if (SITE_LAUNCH) siteDates.push(SITE_LAUNCH);
  siteDates.sort();
  const siteLiveSince = siteDates[0] ?? null;

  const allTime: ProductAllTimeStats = {
    pageViews: Math.max(agg.pageViewsAllTime, 0),
    visitors: Math.max(agg.visitorsAllTime, wallets.connectedAllTime),
    actions: Math.max(agg.actionsAllTime, derivedBundle.totalTrades),
    walletConnectEvents: rpc?.wallet_connect_events ?? wallets.connectedAllTime,
    trades: derivedBundle.totalTrades,
    nexusDecisions: derivedBundle.derived.nexusDecisions,
    prismPredictions: derivedBundle.derived.prismPredictions,
    gateApiCalls,
  };

  if (wallets.tradingWallets > allTime.visitors) {
    allTime.visitors = wallets.tradingWallets;
  }

  return {
    configured: Boolean(getSupabase()) || storage === "local",
    storage,
    tableReady,
    siteLiveSince,
    ...agg,
    wallets: {
      ...wallets,
      tradingWallets: Math.max(wallets.tradingWallets, derivedBundle.derived.demoWallets),
    },
    allTime,
    derived: derivedBundle.derived,
  };
}
