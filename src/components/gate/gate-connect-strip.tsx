"use client";

import { ArrowUpRight, Wallet } from "lucide-react";
import { useAccount, useBalance } from "wagmi";
import { MeridianWalletConnect } from "@/components/nexus/meridian-wallet-connect";
import { GatePermitSwap } from "@/components/gate/gate-permit-swap";
import { BSC_CHAIN_ID, BSC_CHAIN_LABEL } from "@/lib/bsc-chain";
import { TRADING_SETTLEMENT } from "@/lib/trading-copy";
import { nexusGlassCta } from "@/lib/nexus-action-glass";
import { truncateHash } from "@/lib/utils";

/** Gate strategy desk — connect any BSC wallet, then sign Chapel swaps inline or in NEXUS. */
export function GateConnectStrip({
  symbol,
  permit,
  permitId,
  priceUsd,
  onOpenNexus,
  onOpenAutopilot,
  routerDirection,
}: {
  symbol: string;
  permit?: "GRANT" | "DENY";
  permitId?: string | null;
  priceUsd?: number | null;
  onOpenNexus?: () => void;
  onOpenAutopilot?: () => void;
  routerDirection?: "LONG" | "SHORT" | "FLAT";
}) {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address, chainId: BSC_CHAIN_ID });
  const walletTbnb = balance ? Number(balance.formatted) : 0;
  const granted = permit === "GRANT";
  const canAutopilot = granted && routerDirection === "LONG" && onOpenAutopilot;
  const px = priceUsd != null && priceUsd > 0 ? priceUsd : null;

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-violet-400/25 bg-violet-500/10 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-2.5">
            <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
            <div>
              <p className="text-sm font-semibold text-white">Connect wallet to settle {symbol} on Chapel</p>
              <p className="mt-1 text-xs text-white/60">
                Trust Wallet · MetaMask · WalletConnect · any wallet on {BSC_CHAIN_LABEL} · real PancakeSwap txs
              </p>
            </div>
          </div>
          <MeridianWalletConnect compact label="Connect wallet" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.08] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/90">
              <Wallet className="h-3.5 w-3.5" />
              Wallet ready · {TRADING_SETTLEMENT.dex}
            </p>
            <p className="mt-1 text-lg font-semibold text-white">{walletTbnb.toFixed(4)} tBNB</p>
            <p className="mt-1 text-xs text-white/55">
              {address ? truncateHash(address, 6, 4) : "—"} · desk {TRADING_SETTLEMENT.deskSymbols.join(" · ")} · permit{" "}
              {granted ? "GRANT" : permit ?? "pending"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canAutopilot ? (
              <button
                type="button"
                onClick={onOpenAutopilot}
                className={nexusGlassCta(
                  "autopilot",
                  "min-h-[40px] px-4 py-2 text-xs font-semibold border-violet-400/40 bg-violet-500/15 text-violet-50",
                )}
              >
                Start autopilot
              </button>
            ) : null}
            {onOpenNexus ? (
              <button
                type="button"
                onClick={onOpenNexus}
                className={nexusGlassCta("swap", "min-h-[40px] px-4 py-2 text-xs font-semibold")}
              >
                <span className="flex items-center gap-1">
                  Full NEXUS desk
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </button>
            ) : null}
          </div>
        </div>
        {walletTbnb < 0.001 && (
          <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Fund tBNB from the testnet faucet before signing swaps.
          </p>
        )}
      </div>

      {granted && permitId && px != null ? (
        <GatePermitSwap symbol={symbol} priceUsd={px} permitId={permitId} granted />
      ) : granted && permitId && px == null ? (
        <p className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-white/55">
          Permit GRANT — waiting for live CMC price before inline Chapel sizing.
        </p>
      ) : (
        <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          Constitution DENY for {symbol} — wallet connected but BUY blocked. Use NEXUS to review thesis or sell existing
          holdings.
        </p>
      )}
    </div>
  );
}
