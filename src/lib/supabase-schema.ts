import { readFileSync } from "fs";
import { join } from "path";

export const SUPABASE_TABLES = [
  "demo_portfolios",
  "nexus_decisions",
  "prism_predictions",
  "agent_vault_ledgers",
  "agent_vault_meta",
  "product_events",
] as const;

export type SupabaseTableName = (typeof SUPABASE_TABLES)[number];

export function loadSupabaseSchemaSql(): string {
  return readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");
}

export function resolveSupabaseProjectRef(): string | null {
  return (
    process.env.SUPABASE_PROJECT_REF ??
    process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ??
    null
  );
}

/** Apply full schema via Supabase Management API (needs SUPABASE_ACCESS_TOKEN). */
export async function applySupabaseSchemaViaManagementApi(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const projectRef = resolveSupabaseProjectRef();
  if (!token || !projectRef) {
    return { ok: false, error: "SUPABASE_ACCESS_TOKEN or project ref missing" };
  }

  const sql = loadSupabaseSchemaSql();
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  if (!res.ok) {
    const duplicatePolicy =
      text.includes("already exists") && text.toLowerCase().includes("policy");
    if (duplicatePolicy) return { ok: true };
    return { ok: false, error: `Management API ${res.status}: ${text.slice(0, 400)}` };
  }
  return { ok: true };
}
