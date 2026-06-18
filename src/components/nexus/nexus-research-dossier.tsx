"use client";

import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  ExternalLink,
  Loader2,
  Newspaper,
  Shield,
  Wallet,
} from "lucide-react";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";
import { NexusHolderTables } from "@/components/nexus/nexus-holder-table";
import { truncateHash } from "@/lib/utils";
import type { TokenDossierPayload, TokenResearchDossier } from "@/lib/nexus-research-dossier";
import { sanitizeIntelNote } from "@/lib/nexus-copy";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

function RiskVerdict({ verdict }: { verdict: "low" | "medium" | "high" | "critical" }) {
  const map = {
    low: "text-emerald-200 border-emerald-400/30",
    medium: "text-amber-100 border-amber-400/30",
    high: "text-orange-100 border-orange-400/30",
    critical: "text-rose-100 border-rose-400/30",
  };
  return (
    <span className={`rounded-lg border px-2 py-1 text-xs font-bold uppercase ${map[verdict]}`}>
      {verdict} risk
    </span>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-xs leading-relaxed text-white/80">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400/80" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function NexusResearchDossierLive({
  token,
  payload,
  loading,
  error,
  holdersOnly = false,
}: {
  token: TrendingMarketToken;
  payload: TokenDossierPayload | null;
  loading: boolean;
  error: string | null;
  /** Only holder/trader tables (intel panels live under chart) */
  holdersOnly?: boolean;
}) {
  const hasHolderRows =
    (payload?.topHolders?.length ?? 0) > 0 || (payload?.topTraders?.length ?? 0) > 0;
  if (holdersOnly && !loading && !hasHolderRows) return null;

  return (
    <div className="nexus-research-dossier-live space-y-3">
      {!holdersOnly && error && !loading && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      )}
      <NexusHolderTables
        topHolders={payload?.topHolders ?? []}
        topTraders={payload?.topTraders ?? []}
        loading={loading}
        symbol={token.symbol}
      />
      {!holdersOnly && !payload?.dossier && loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Scanning holders, TA, and news…
        </div>
      )}
      {payload?.dossier?.dataNotes?.length ? (
        <p className="text-[10px] text-white/40">
          {payload.dossier.dataNotes.map(sanitizeIntelNote).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

export function NexusResearchDossierDeep({
  dossier,
  loading,
}: {
  dossier: TokenResearchDossier | undefined;
  loading: boolean;
}) {
  if (!dossier) {
    if (loading) return null;
    return null;
  }

  return (
    <div className="nexus-research-dossier-deep space-y-3">
      <NexusCollapsible
        label="Fundamentals & narrative"
        hint={`${dossier.fundamentals.length} bullets · why it's on the tape`}
        variant="reasoning"
        icon={BookOpen}
        defaultOpen={false}
        showCollapseHint
      >
        <BulletList items={dossier.fundamentals} />
      </NexusCollapsible>

      <NexusCollapsible
        label="Creator & rug check"
        hint={dossier.creatorRisk.scamLabel ?? `${dossier.creatorRisk.verdict} · holder graph`}
        variant="intel"
        icon={Shield}
        defaultOpen={false}
        showCollapseHint
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <RiskVerdict verdict={dossier.creatorRisk.verdict} />
            {dossier.creatorRisk.scamLabel && (
              <span className="text-xs font-semibold text-rose-200">{dossier.creatorRisk.scamLabel}</span>
            )}
          </div>
          {dossier.creatorRisk.creatorAddress && (
            <p className="text-xs text-white/75">
              Creator / deployer:{" "}
              <span className="font-mono text-white">
                {truncateHash(dossier.creatorRisk.creatorAddress, 8, 6)}
              </span>
            </p>
          )}
          <a
            href={dossier.creatorRisk.bubblemapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-200 hover:text-violet-100"
          >
            Open holder graph
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {dossier.creatorRisk.rugFlags.length > 0 ? (
            <ul className="space-y-1 text-xs text-amber-100/90">
              {dossier.creatorRisk.rugFlags.map((f, i) => (
                <li key={i} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-white/55">No major rug heuristics — still size small on thin pools.</p>
          )}
        </div>
      </NexusCollapsible>

      <NexusCollapsible
        label="Copy-trade wallets"
        hint={
          dossier.copyTradeStatus ??
          (dossier.copyTradeWallets.length > 0
            ? `${dossier.copyTradeWallets.length} smart-money / KOL wallets`
            : "Smart-money / KOL scan")
        }
        variant="intel"
        icon={Wallet}
        defaultOpen={false}
        showCollapseHint
      >
        {dossier.copyTradeWallets.length > 0 ? (
          <ul className="space-y-2">
            {dossier.copyTradeWallets.map((w) => (
              <li
                key={w.address}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs"
              >
                <span className="font-mono text-white/90">{truncateHash(w.address, 8, 6)}</span>
                <span className="truncate text-white/55">{w.note}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs leading-relaxed text-white/60">
            {dossier.copyTradeStatus ??
              "No smart-money wallets surfaced for this pair on supported chains."}
          </p>
        )}
      </NexusCollapsible>

      <NexusCollapsible
        label="Token news & social"
        hint={
          dossier.socialNews[0]?.startsWith("No verified")
            ? "Social · symbol match"
            : `${dossier.socialNews.length} symbol-matched headlines`
        }
        variant="default"
        icon={Newspaper}
        defaultOpen={false}
        showCollapseHint
      >
        <BulletList items={dossier.socialNews} />
      </NexusCollapsible>
    </div>
  );
}

/** @deprecated use NexusResearchDossierLive + Deep with useTokenDossier */
export function NexusResearchDossierPanel({ token }: { token: TrendingMarketToken }) {
  return <NexusResearchDossierLive token={token} payload={null} loading={false} error={null} />;
}
