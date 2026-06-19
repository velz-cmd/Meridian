import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { SupabaseTableName } from "@/lib/supabase-schema";

export type DemoPortfolioTableStatus = {
  configured: boolean;
  tableOk: boolean;
  error?: string;
};

export type SupabaseTableProbe = {
  table: SupabaseTableName;
  ok: boolean;
  error?: string;
};

export type SupabaseHealthStatus = {
  configured: boolean;
  demoPortfolio: DemoPortfolioTableStatus;
  tables: SupabaseTableProbe[];
  allTablesOk: boolean;
};

/** Verifies demo_portfolios exists (required for portfolio persistence on Vercel). */
export async function probeDemoPortfolioTable(): Promise<DemoPortfolioTableStatus> {
  if (!isSupabaseConfigured()) {
    return { configured: false, tableOk: false, error: "supabase env missing" };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { configured: false, tableOk: false, error: "supabase client unavailable" };
  }

  const probeWallet = "__health_probe__";
  const { error: upsertError } = await supabase.from("demo_portfolios").upsert(
    {
      wallet: probeWallet,
      positions: [],
      trades: [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "wallet" },
  );

  if (upsertError) {
    const msg = upsertError.message ?? "unknown";
    const missing =
      msg.includes("does not exist") ||
      msg.includes("schema cache") ||
      msg.includes("relation") ||
      msg.includes("demo_portfolios");
    return {
      configured: true,
      tableOk: false,
      error: missing ? "run supabase/schema.sql in SQL Editor" : msg,
    };
  }

  await supabase.from("demo_portfolios").delete().eq("wallet", probeWallet);

  return { configured: true, tableOk: true };
}

async function probeTable(table: SupabaseTableName): Promise<SupabaseTableProbe> {
  const supabase = getSupabase();
  if (!supabase) {
    return { table, ok: false, error: "client unavailable" };
  }

  const { error } = await supabase.from(table).select("*").limit(1);
  if (!error) return { table, ok: true };

  const msg = error.message ?? "unknown";
  const missing =
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("relation");
  return {
    table,
    ok: false,
    error: missing ? "table missing — run npm run setup:supabase" : msg,
  };
}

export async function probeSupabaseTables(): Promise<SupabaseHealthStatus> {
  const demoPortfolio = await probeDemoPortfolioTable();
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      demoPortfolio,
      tables: [],
      allTablesOk: false,
    };
  }

  const tables: SupabaseTableProbe[] = await Promise.all(
    (
      [
        "demo_portfolios",
        "nexus_decisions",
        "prism_predictions",
        "agent_vault_ledgers",
        "agent_vault_meta",
        "product_events",
        "connected_wallets",
      ] as SupabaseTableName[]
    ).map(probeTable),
  );

  return {
    configured: true,
    demoPortfolio,
    tables,
    allTablesOk: demoPortfolio.tableOk && tables.every((t) => t.ok),
  };
}
