"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Crosshair,
  Fish,
  Loader2,
  Radar,
  Sparkles,
  Target,
  UserX,
  Users,
  Zap,
} from "lucide-react";
import { formatCompact, formatUsd, truncateHash } from "@/lib/utils";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";
import { WalletScoreChip } from "@/components/nexus/nexus-wallet-score";
import { useIntegrationsStatus } from "@/hooks/use-integrations-status";
import type { TokenTx, TokenWhale, TokenInsider } from "@/lib/storage";
import type { WalletScore } from "@/lib/wallet-score";

type Detection = {
  serverHasKey?: boolean;
  trades: TokenTx[];
  whales: TokenWhale[];
  snipers: Array<{ address: string; label: string }>;
  insiders: TokenInsider[];
  holders: Array<TokenWhale & { rank?: number }>;
  walletScores: WalletScore[];
  summary: {
    sniperCount?: number;
    whaleCount?: number;
    insiderCount?: number;
    top10Pct?: number;
    holderCount?: number;
    birdeyeConnected?: boolean;
    birdeyeLive?: boolean;
    paprikaConnected?: boolean;
    holderSource?: "holders" | "top_traders";
    dataSource?: "birdeye" | "dexpaprika" | "dex" | "birdeye_pending" | "unavailable";
    buy24h?: number;
    sell24h?: number;
    trade24h?: number;
  };
  errors?: string[];
};

function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "error" | "loading";
  children: React.ReactNode;
}) {
  const styles = {
    ok: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
    warn: "border-amber-400/40 bg-amber-500/15 text-amber-100",
    error: "border-rose-400/40 bg-rose-500/15 text-rose-100",
    loading: "border-white/15 bg-white/5 text-white/80",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

export function NexusTokenDetectPanel({
  chainId,
  tokenAddress,
  symbol,
  txns24h,
  volume24h,
  agentAction,
  onIntelUpdate,
}: {
  chainId?: string;
  tokenAddress?: string;
  symbol?: string;
  txns24h?: { buys: number; sells: number };
  volume24h?: number;
  agentAction?: string;
  onIntelUpdate?: (summary: {
    holderCount?: number;
    sniperCount?: number;
    whaleCount?: number;
    insiderCount?: number;
    top10Pct?: number;
  }) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [tab, setTab] = useState<"txs" | "whales" | "snipers" | "insiders">("txs");
  const [data, setData] = useState<Detection | null>(null);
  const [loading, setLoading] = useState(false);
  const { status: integrations } = useIntegrationsStatus();

  const dexRef = useRef({ buys: txns24h?.buys ?? 0, sells: txns24h?.sells ?? 0, volume: volume24h ?? 0 });
  dexRef.current = { buys: txns24h?.buys ?? 0, sells: txns24h?.sells ?? 0, volume: volume24h ?? 0 };

  useEffect(() => {
    if (!chainId || !tokenAddress) return;
    let cancelled = false;

    async function load() {
      if (typeof document !== "undefined" && document.hidden) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          chainId: chainId!,
          address: tokenAddress!,
          buys: String(dexRef.current.buys),
          sells: String(dexRef.current.sells),
          volume: String(dexRef.current.volume),
        });
        const res = await fetch(`/api/nexus/token/detect?${params}&full=1&t=${Date.now()}`);
        const json = await res.json();
        if (!cancelled && res.ok) {
          setData(json);
          const live =
            json.summary?.birdeyeLive ||
            json.summary?.dataSource === "birdeye" ||
            json.summary?.dataSource === "dexpaprika" ||
            json.summary?.dataSource === "dex";
          if (live && onIntelUpdate) {
            onIntelUpdate({
              holderCount: json.summary.holderCount,
              sniperCount: json.summary.sniperCount,
              whaleCount: json.summary.whaleCount,
              insiderCount: json.summary.insiderCount,
              top10Pct: json.summary.top10Pct,
            });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 45_000);
    const onVis = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [chainId, tokenAddress, onIntelUpdate]);

  if (!chainId || !tokenAddress) return null;

  const s = data?.summary;
  const isLive =
    s?.birdeyeLive ||
    s?.dataSource === "birdeye" ||
    s?.dataSource === "dexpaprika" ||
    s?.dataSource === "dex";
  const sourceLabel =
    s?.dataSource === "dexpaprika"
      ? "On-chain pool"
      : s?.dataSource === "birdeye"
        ? s?.holderSource === "top_traders"
          ? "Top traders · live"
          : "On-chain · live"
        : s?.dataSource === "dex"
          ? "Market flow"
          : loading
            ? "Scanning…"
            : "Awaiting data";

  const buys = s?.buy24h ?? txns24h?.buys ?? 0;
  const sells = s?.sell24h ?? txns24h?.sells ?? 0;
  const flowBias = buys > sells * 1.1 ? "Buy pressure" : sells > buys * 1.1 ? "Sell pressure" : "Balanced flow";

  const statusTone: "ok" | "warn" | "error" | "loading" = loading
    ? "loading"
    : isLive
      ? "ok"
      : integrations?.birdeye
        ? "warn"
        : "error";

  const tabs = [
    { id: "txs" as const, label: "Swaps", icon: Target },
    { id: "whales" as const, label: "Whales", icon: Fish },
    { id: "snipers" as const, label: "Snipers", icon: Crosshair },
    { id: "insiders" as const, label: "Insiders", icon: UserX },
  ];

  return (
    <NexusCollapsible
      label="Agent intel scan"
      hint={`${symbol ?? "Token"} · ${flowBias} · ${sourceLabel}`}
      variant="intel"
      icon={Radar}
      defaultOpen={false}
      showCollapseHint
    >
      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/15 via-cyan-500/5 to-transparent p-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-violet-200" />
              <span className="text-sm font-bold text-white">NEXUS handled analysis</span>
            </div>
            {statusTone === "loading" && (
              <StatusPill tone="loading">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Scanning
              </StatusPill>
            )}
            {statusTone === "ok" && (
              <StatusPill tone="ok">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {sourceLabel}
              </StatusPill>
            )}
            {statusTone === "warn" && (
              <StatusPill tone="warn">
                <AlertTriangle className="h-3.5 w-3.5" />
                Partial data
              </StatusPill>
            )}
          </div>

          <p className="text-xs leading-relaxed text-white/75">
            You do not need extra tabs — the agent reads liquidity, flow, whales, and news, then signals{" "}
            <strong className="text-cyan-100">{agentAction ?? "HOLD"}</strong> for you.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                icon: Users,
                label: "Holders",
                value: isLive ? String(s?.holderCount ?? "—") : "—",
              },
              {
                icon: Crosshair,
                label: "Snipers",
                value: isLive ? String(s?.sniperCount ?? data?.snipers.length ?? 0) : "—",
              },
              {
                icon: UserX,
                label: "Insiders",
                value: isLive ? String(s?.insiderCount ?? data?.insiders.length ?? 0) : "—",
              },
              {
                icon: Fish,
                label: "Whales",
                value: isLive ? String(s?.whaleCount ?? data?.whales.length ?? 0) : "—",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 transition hover:border-cyan-400/25"
              >
                <m.icon className="mb-1 h-4 w-4 text-cyan-300/80" />
                <p className="text-[10px] uppercase tracking-wider text-white/45">{m.label}</p>
                <p className="text-sm font-bold text-white">{m.value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] text-sm font-semibold text-white/75 transition hover:bg-white/10"
        >
          <Sparkles className="h-4 w-4 text-violet-300" />
          {showDetails ? "Hide raw intel" : "View swap / whale rows"}
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-1.5 pb-2">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      tab === id
                        ? "bg-amber-400/20 text-amber-50"
                        : "bg-white/5 text-white/65 hover:bg-white/10"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="max-h-40 space-y-1.5 overflow-y-auto">
                {tab === "txs" &&
                  (data?.trades.length ? (
                    data.trades.map((tx, i) => (
                      <Row
                        key={tx.hash ?? i}
                        left={
                          <span
                            className={
                              tx.side === "buy"
                                ? "font-semibold text-emerald-300"
                                : tx.side === "sell"
                                  ? "font-semibold text-rose-300"
                                  : "text-white/80"
                            }
                          >
                            {tx.side.toUpperCase()} · {truncateHash(tx.trader, 6, 4)}
                          </span>
                        }
                        right={
                          <>
                            <span className="font-medium">{formatUsd(tx.amountUsd)}</span>
                          </>
                        }
                      />
                    ))
                  ) : (
                    <Empty text="No swaps yet — refreshes every 45s from on-chain feeds." />
                  ))}

                {tab === "whales" &&
                  (data?.whales.length ? (
                    data.whales.map((w, i) => (
                      <Row
                        key={w.address + i}
                        left={
                          <span className="text-white/90">
                            {w.label} · {truncateHash(w.address, 6, 4)}
                          </span>
                        }
                        right={
                          <span>
                            {formatCompact(w.balance)} · {w.pct.toFixed(1)}%
                          </span>
                        }
                        score={data.walletScores.find(
                          (wsc) => wsc.address.toLowerCase() === w.address.toLowerCase(),
                        )}
                      />
                    ))
                  ) : (
                    <Empty text="Whale / trader rows load when on-chain volume is detected." />
                  ))}

                {tab === "snipers" &&
                  (data?.snipers.length ? (
                    data.snipers.map((sn, i) => (
                      <Row
                        key={sn.address + i}
                        left={<span>{sn.label}</span>}
                        right={truncateHash(sn.address, 8, 6)}
                      />
                    ))
                  ) : (
                    <Empty
                      text={
                        isLive
                          ? "No sniper wallets flagged for this mint (good sign on many pairs)."
                          : "Snipers load when on-chain scan connects."
                      }
                    />
                  ))}

                {tab === "insiders" &&
                  (data?.insiders.length ? (
                    data.insiders.map((ins, i) => (
                      <Row
                        key={ins.address + i}
                        left={
                          <span>
                            {ins.label} · {truncateHash(ins.address, 6, 4)}
                          </span>
                        }
                        right={<span>{ins.pct.toFixed(1)}% supply</span>}
                      />
                    ))
                  ) : (
                    <Empty
                      text={
                        isLive
                          ? "No insider/deployer cluster flagged — still check Creator & rug check."
                          : "Insider rows load when on-chain scan connects."
                      }
                    />
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NexusCollapsible>
  );
}

function Row({
  left,
  right,
  score,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  score?: WalletScore;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm">
      <span className="min-w-0 truncate">{left}</span>
      <div className="flex shrink-0 items-center gap-1.5 text-xs">
        {right}
        {score && <WalletScoreChip score={score} />}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-white/12 px-3 py-3 text-center text-xs text-white/60">
      {text}
    </p>
  );
}
