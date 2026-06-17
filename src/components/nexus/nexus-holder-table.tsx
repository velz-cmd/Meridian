"use client";

import type { ReactNode } from "react";
import { Fish, Users } from "lucide-react";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";
import { truncateHash } from "@/lib/utils";
import type { HolderTableRow, TraderTableRow } from "@/lib/nexus-research-dossier";

function SourceBadge({ source }: { source: string }) {
  if (source === "demo") {
    return (
      <span className="rounded border border-amber-400/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-100">
        Demo
      </span>
    );
  }
  return null;
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<{ key: string; cells: ReactNode[] }>;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/12 px-3 py-4 text-center text-xs text-white/55">
        No wallet rows yet — scanning on-chain holder graph and pool trades…
      </p>
    );
  }

  return (
    <div className="nexus-holder-table-wrap overflow-auto rounded-xl border border-white/10">
      <table className="nexus-data-table w-full min-w-[280px] text-left text-xs">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.04] text-[10px] uppercase tracking-wider text-white/45">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-white/[0.06] hover:bg-white/[0.03]">
              {row.cells.map((cell, i) => (
                <td key={i} className="px-3 py-2 text-white/85">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NexusHolderTables({
  topHolders,
  topTraders,
  loading,
  symbol,
}: {
  topHolders: HolderTableRow[];
  topTraders: TraderTableRow[];
  loading?: boolean;
  symbol?: string;
}) {
  const holderHint = loading
    ? "Loading holders…"
    : topHolders.length === 0
      ? `${symbol ?? "Token"} · no live holder rows yet`
      : `${topHolders.length} wallets · ${topHolders[0]?.source ?? "on-chain"}`;

  const traderHint = loading
    ? "Loading traders…"
    : topTraders.length === 0
      ? "No live trader rows yet"
      : `${topTraders.length} active wallets · volume / smart tags`;

  return (
    <div className="space-y-3">
      <NexusCollapsible
        label="Top holders"
        hint={holderHint}
        variant="intel"
        icon={Users}
        defaultOpen={false}
        showCollapseHint
      >
        <DataTable
          columns={["#", "Wallet", "% supply", "Label"]}
          rows={topHolders.map((h) => ({
            key: h.address + h.rank,
            cells: [
              <span className="tabular-nums text-white/50">{h.rank}</span>,
              <span className="flex items-center gap-1.5 font-mono">
                {truncateHash(h.address, 6, 4)}
                <SourceBadge source={h.source} />
              </span>,
              <span className="font-semibold tabular-nums">{h.pctSupply.toFixed(2)}%</span>,
              <span className="truncate text-white/60">{h.label ?? "—"}</span>,
            ],
          }))}
        />
      </NexusCollapsible>

      <NexusCollapsible
        label="Top traders · smart money"
        hint={traderHint}
        variant="intel"
        icon={Fish}
        defaultOpen={false}
        showCollapseHint
      >
        <DataTable
          columns={["#", "Wallet", "PnL / vol", "Trades"]}
          rows={topTraders.map((t) => ({
            key: t.address + t.rank,
            cells: [
              <span className="tabular-nums text-white/50">{t.rank}</span>,
              <span className="flex items-center gap-1.5 font-mono">
                {truncateHash(t.address, 6, 4)}
                <SourceBadge source={t.source} />
              </span>,
              <span className="font-medium">{t.pnlOrVolume}</span>,
              <span className="tabular-nums text-white/55">{t.trades ?? "—"}</span>,
            ],
          }))}
        />
      </NexusCollapsible>
    </div>
  );
}
