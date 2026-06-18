"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Wallet } from "lucide-react";
import {
  CIRCLE_AGENTS_MARKETPLACE_URL,
  CIRCLE_AGENTS_DOCS_URL,
} from "@/lib/circle-agents";

type GatewayStatus = {
  sellerConfigured?: boolean;
  gatewayBalance?: string | null;
  walletUsdc?: string | null;
  prices?: { alphaScan?: string; tokenDossier?: string };
  agentVault?: string | null;
};

export function NexusCircleAgentCard({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<GatewayStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/nexus/agent/gateway", {
          signal: AbortSignal.timeout(8_000),
        });
        const json = await res.json();
        if (!cancelled) setStatus(json);
      } catch {
        if (!cancelled) setStatus({ sellerConfigured: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const gw = status?.gatewayBalance;
  const vault = status?.agentVault;

  return (
    <div
      className={`rounded-xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.08] to-cyan-500/[0.05] ${
        compact ? "px-3 py-2.5" : "px-3 py-3"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-200/90">
            <Wallet className="h-3.5 w-3.5 shrink-0" />
            Circle Agent Wallet
          </p>
          <p className="mt-1 text-[11px] leading-snug text-white/70">
            Circle API billing (x402) — separate from BSC Testnet tBNB trades.
          </p>
        </div>
        <a
          href={CIRCLE_AGENTS_MARKETPLACE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg border border-white/15 p-1.5 text-white/60 hover:border-cyan-400/35 hover:text-cyan-200"
          title="Circle Agent Marketplace"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[10px] tabular-nums text-white/55">
        <span className="rounded-md border border-white/10 bg-black/30 px-2 py-0.5">
          Gateway: {gw != null ? `$${gw}` : "—"}
        </span>
        <span className="rounded-md border border-white/10 bg-black/30 px-2 py-0.5">
          API credits: {status?.walletUsdc != null ? `$${status.walletUsdc}` : "—"}
        </span>
        {status?.sellerConfigured ? (
          <span className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-100/90">
            x402 seller live
          </span>
        ) : (
          <span className="rounded-md border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-amber-100/80">
            Set X402_SELLER_ADDRESS on Vercel
          </span>
        )}
      </div>
      {!compact && vault ? (
        <p className="mt-1.5 truncate font-mono text-[9px] text-white/35" title={vault}>
          Vault {vault.slice(0, 10)}…{vault.slice(-6)}
        </p>
      ) : null}
      <p className="mt-2 text-[10px] text-white/40">
        <a
          href={CIRCLE_AGENTS_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-300/80 hover:underline"
        >
          x402 + Gateway docs
        </a>
        {" · "}
        List NEXUS on{" "}
        <a
          href={CIRCLE_AGENTS_MARKETPLACE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-300/80 hover:underline"
        >
          agents.circle.com
        </a>
      </p>
    </div>
  );
}
