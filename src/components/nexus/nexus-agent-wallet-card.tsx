"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, Loader2, RefreshCw, Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { useToast } from "@/components/ui/toast-provider";
import { useAgentWallet } from "@/hooks/use-agent-wallet";
import { truncateHash } from "@/lib/utils";
import { BSC_CHAIN_LABEL, bscExplorerAddress } from "@/lib/bsc-chain";

export function NexusAgentWalletCard({
  requiredUsdc,
  compact = false,
}: {
  requiredUsdc: number;
  compact?: boolean;
}) {
  const toast = useToast();
  const { address: connectedWallet } = useAccount();
  const { wallet, loading, usdcBalance, refreshBalance, syncDeposits, creditDepositTx } =
    useAgentWallet();
  const [depositHint, setDepositHint] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [crediting, setCrediting] = useState(false);
  const ready = usdcBalance >= requiredUsdc;

  async function copyAddress() {
    if (!wallet?.address) return;
    await navigator.clipboard.writeText(wallet.address);
    toast({ type: "success", title: "Copied", message: "Agent deposit address copied" });
  }

  async function handleSync(silent = false) {
    if (!silent) setSyncing(true);
    try {
      const data = (await syncDeposits()) as {
        newDeposits?: number;
        ledger?: { balanceUsdc?: number; totalDeposited?: number };
      };
      const n = data.newDeposits ?? 0;
      const refreshed = await refreshBalance();
      const bal = refreshed?.balanceUsdc ?? data.ledger?.balanceUsdc ?? usdcBalance;
      if (!silent) {
        toast({
          type: n > 0 || bal > 0 ? "success" : "info",
          title: n > 0 ? "Deposit credited" : bal > 0 ? "Balance loaded" : "Sync complete",
          message:
            n > 0
              ? `${n} deposit(s) · balance $${bal.toFixed(2)}`
              : bal > 0
                ? `Vault balance $${bal.toFixed(2)} (USD notional from tBNB)`
                : `No deposit found — send tBNB on ${BSC_CHAIN_LABEL} from your connected wallet to the vault address, then Credit tx with your hash`,
        });
      }
      setDepositHint(
        bal > 0
          ? `Ready for autopilot · $${bal.toFixed(2)} available`
          : "Send tBNB from connected wallet → vault on BSC Testnet, then Sync or Credit tx",
      );
    } catch (e) {
      toast({
        type: "error",
        title: "Sync failed",
        message: e instanceof Error ? e.message : "Could not sync vault",
      });
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white/60">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading agent vault…
      </div>
    );
  }

  if (!wallet?.configured || !wallet.address) {
    return (
      <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
        Agent vault not configured on server. Add{" "}
        <code className="text-amber-50">ARC_AGENT_PRIVATE_KEY</code> or{" "}
        <code className="text-amber-50">NEXT_PUBLIC_AGENT_VAULT_ADDRESS</code> in Vercel → Settings →
        Environment Variables, then redeploy.
      </p>
    );
  }

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        ready ? "border-emerald-400/30 bg-emerald-500/10" : "border-amber-400/30 bg-amber-500/10"
      }`}
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        <Wallet className="h-4 w-4 text-cyan-200" />
        Agent vault · {usdcBalance.toFixed(2)} USD notional
      </p>
      <p className="mt-1 text-xs text-white/60">
        {ready
          ? `Funded · $${requiredUsdc.toFixed(2)} needed per buy (trade on ${BSC_CHAIN_LABEL})`
          : `Send tBNB on ${BSC_CHAIN_LABEL} to the vault below from your connected wallet`}
      </p>
      {depositHint && <p className="text-[10px] text-emerald-200/80">{depositHint}</p>}
      {connectedWallet && (
        <p className="text-[10px] text-white/45">
          Credits apply to connected wallet:{" "}
          <span className="font-mono text-cyan-200/90">{truncateHash(connectedWallet, 6, 4)}</span>
        </p>
      )}
      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-black/40 px-2 py-1.5 text-[11px] text-cyan-100/90 sm:text-xs">
            {wallet.address}
          </code>
          <button
            type="button"
            onClick={() => void copyAddress()}
            className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 text-xs font-bold text-cyan-50"
          >
            <Copy className="h-4 w-4" />
            Copy address
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={bscExplorerAddress(wallet.address)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-cyan-400/30 px-2.5 text-xs font-bold text-cyan-100"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Explorer
          </a>
          <button
            type="button"
            disabled={syncing}
            onClick={() => void handleSync(false)}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-violet-400/40 bg-violet-500/15 px-2.5 text-xs font-bold text-violet-100"
          >
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sync deposits
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="Paste deposit tx hash (optional)"
            className="min-h-[40px] min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-2.5 text-xs text-white"
          />
          <button
            type="button"
            disabled={crediting || !txHash.trim()}
            onClick={async () => {
              setCrediting(true);
              try {
                const data = (await creditDepositTx(txHash.trim())) as {
                  credited?: number;
                  ledger?: { balanceUsdc?: number };
                };
                const refreshed = await refreshBalance();
                const bal = refreshed?.balanceUsdc ?? data.ledger?.balanceUsdc ?? 0;
                toast({
                  type: "success",
                  title: "Deposit credited",
                  message: data.credited
                    ? `+${data.credited.toFixed(4)} tBNB · balance $${bal.toFixed(2)}`
                    : `Balance $${bal.toFixed(2)} (tBNB notional)`,
                });
                setDepositHint(`Ready for autopilot · $${bal.toFixed(2)} available`);
                setTxHash("");
              } catch (e) {
                toast({
                  type: "error",
                  title: "Could not credit",
                  message: e instanceof Error ? e.message : "Check tx is tBNB from your wallet to vault",
                });
              } finally {
                setCrediting(false);
              }
            }}
            className="inline-flex min-h-[40px] items-center rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 text-xs font-bold text-emerald-100 disabled:opacity-40"
          >
            {crediting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Credit tx"}
          </button>
        </div>
      </div>
      <p className="mt-1.5 text-[10px] text-white/45">
        <strong className="text-white/70">Legacy API vault</strong> — optional x402 credits only. Buy, sell,
        swap, and autopilot all use wallet tBNB on BSC Testnet via PancakeSwap.
      </p>
    </div>
  );
}
