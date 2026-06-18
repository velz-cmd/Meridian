"use client";

import Link from "next/link";
import { useAccount, useBalance } from "wagmi";
import { Check, ExternalLink, Wallet } from "lucide-react";
import { BSC_CHAIN_ID, BSC_CHAIN_LABEL } from "@/lib/bsc-chain";
import { TRADING_SETTLEMENT, TRADING_WALLET_HINT } from "@/lib/trading-copy";
import { cn } from "@/lib/utils";

type StepState = "done" | "current" | "pending";

function stepState(index: number, flags: boolean[]): StepState {
  if (flags[index]) return "done";
  const firstPending = flags.findIndex((f) => !f);
  if (firstPending === index) return "current";
  return "pending";
}

export function BscTestnetTradingBanner({
  className,
  compact = false,
  selectedSymbol,
  permitGranted,
}: {
  className?: string;
  compact?: boolean;
  selectedSymbol?: string;
  permitGranted?: boolean | null;
}) {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address, chainId: BSC_CHAIN_ID });
  const walletTbnb = balance ? Number(balance.formatted) : 0;

  const flags = [
    isConnected,
    walletTbnb > 0.001,
    Boolean(selectedSymbol),
    permitGranted === true,
  ];

  const steps = [
    { n: "1", label: "Connect", detail: BSC_CHAIN_LABEL },
    { n: "2", label: "Fund tBNB", detail: "Testnet faucet" },
    { n: "3", label: "Pick symbol", detail: selectedSymbol ?? "Gate → NEXUS" },
    { n: "4", label: "Permit → trade", detail: permitGranted === true ? "Cleared" : "PancakeSwap" },
  ];

  if (compact && flags.every(Boolean)) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.08] px-3 py-2.5 sm:px-4 sm:py-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200/90">
            <Wallet className="h-3.5 w-3.5" />
            Testnet sandbox · {TRADING_SETTLEMENT.nativeSymbol}
          </p>
          {!compact && (
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/60">{TRADING_WALLET_HINT}</p>
          )}
        </div>
        <a
          href={TRADING_SETTLEMENT.faucetUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-400/35 bg-black/30 px-2.5 py-1.5 text-[10px] font-bold text-emerald-100 hover:bg-emerald-500/15"
        >
          Get tBNB <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {steps.map((s, i) => {
          const state = stepState(i, flags);
          return (
            <div
              key={s.n}
              className={cn(
                "rounded-xl border px-2 py-1.5",
                state === "done" && "border-emerald-400/35 bg-emerald-500/10",
                state === "current" && "border-cyan-400/35 bg-cyan-500/10",
                state === "pending" && "border-white/[0.08] bg-black/25",
              )}
            >
              <p className="flex items-center gap-1 text-[9px] font-bold text-emerald-300/80">
                {state === "done" ? <Check className="h-3 w-3 text-emerald-400" /> : null}
                {s.n}. {s.label}
              </p>
              <p className="truncate text-[10px] font-semibold text-white/75">{s.detail}</p>
            </div>
          );
        })}
      </div>
      {isConnected && (
        <p className="mt-2 text-[10px] text-white/45">
          Wallet: {walletTbnb.toFixed(4)} tBNB · desk: {TRADING_SETTLEMENT.deskSymbols.join(" · ")} ·{" "}
          <Link href="/gate" className="text-emerald-300/90 hover:underline">
            Open router
          </Link>
        </p>
      )}
    </div>
  );
}
