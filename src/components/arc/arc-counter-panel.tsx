"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useDeployContract,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { Box, Copy, ExternalLink, Loader2, Plus, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBnbSettlement } from "@/hooks/use-bnb-settlement";
import {
  ARC_COUNTER_ABI,
  ARC_COUNTER_BYTECODE,
  ARC_COUNTER_STORAGE_KEY,
  arcCounterChain,
  getArcCounterAddress,
} from "@/lib/arc-counter-contract";
import { arcExplorerAddress, arcExplorerTx } from "@/lib/arc-chain";
import { truncateHash } from "@/lib/utils";

function useResolvedCounterAddress() {
  const envAddr = getArcCounterAddress();
  const [localAddr, setLocalAddr] = useState<`0x${string}` | undefined>();

  useEffect(() => {
    try {
      const s = localStorage.getItem(ARC_COUNTER_STORAGE_KEY);
      if (s && /^0x[a-fA-F0-9]{40}$/i.test(s)) {
        setLocalAddr(s as `0x${string}`);
      }
    } catch {
      /* SSR / private mode */
    }
  }, []);

  return useMemo(() => envAddr ?? localAddr, [envAddr, localAddr]);
}

export function ArcCounterPanel() {
  const address = useResolvedCounterAddress();
  const { address: wallet, isConnected } = useAccount();
  const { ensureArcNetwork, onArc } = useBnbSettlement();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { deployContract, data: deployHash, isPending: deploying } = useDeployContract();
  const { data: deployReceipt, isLoading: deployConfirming } = useWaitForTransactionReceipt({
    hash: deployHash,
    chainId: arcCounterChain.id,
  });

  const { data: number, refetch, isLoading: reading } = useReadContract({
    address,
    abi: ARC_COUNTER_ABI,
    functionName: "number",
    chainId: arcCounterChain.id,
    query: { enabled: Boolean(address) },
  });

  const { writeContract, data: txHash, isPending: writing } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: arcCounterChain.id,
  });

  useEffect(() => {
    if (deployReceipt?.contractAddress) {
      localStorage.setItem(ARC_COUNTER_STORAGE_KEY, deployReceipt.contractAddress);
      window.location.reload();
    }
  }, [deployReceipt?.contractAddress]);

  useEffect(() => {
    if (isSuccess) void refetch();
  }, [isSuccess, refetch]);

  const deployFromWallet = useCallback(async () => {
    setError(null);
    try {
      await ensureArcNetwork();
      deployContract({
        abi: ARC_COUNTER_ABI,
        bytecode: ARC_COUNTER_BYTECODE,
        chainId: arcCounterChain.id,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deploy failed");
    }
  }, [deployContract, ensureArcNetwork]);

  const increment = useCallback(async () => {
    if (!address) return;
    setError(null);
    try {
      await ensureArcNetwork();
      writeContract({
        address,
        abi: ARC_COUNTER_ABI,
        functionName: "increment",
        chainId: arcCounterChain.id,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    }
  }, [address, ensureArcNetwork, writeContract]);

  const copyEnvLine = useCallback(() => {
    if (!address) return;
    void navigator.clipboard.writeText(`NEXT_PUBLIC_ARC_COUNTER_ADDRESS=${address}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  if (!address) {
    return (
      <div className="arc-glass-card rounded-2xl border border-white/10 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <Box className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400/90" />
          <div className="w-full">
            <h2 className="text-lg font-semibold text-white">Deploy Counter on Arc</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Connect your wallet (you need Arc Testnet USDC for gas). One click deploys the official
              Arc tutorial contract from your address — no private key in chat or GitHub.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                variant="nexus"
                className="arc-btn-pill gap-2"
                disabled={!isConnected || deploying || deployConfirming}
                onClick={() => void deployFromWallet()}
              >
                {(deploying || deployConfirming) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <Rocket className="h-4 w-4" />
                Deploy from wallet
              </Button>
              {!isConnected && (
                <span className="text-xs text-white/50">Connect wallet (top right) first</span>
              )}
            </div>
            {deployHash && (
              <p className="mt-3 text-xs text-white/50">
                Deploy tx{" "}
                <a
                  href={arcExplorerTx(deployHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-200/90 underline"
                >
                  {truncateHash(deployHash, 10, 8)}
                </a>
                {deployConfirming ? " · confirming…" : ""}
              </p>
            )}
            {error && <p className="mt-3 text-xs text-rose-300/90">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="arc-glass-card rounded-2xl border border-emerald-400/20 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300/80">
            On-chain · Arc Testnet
          </p>
          <h2 className="mt-1 text-2xl font-bold tabular-nums text-white">
            {reading ? "…" : String(number ?? 0)}
          </h2>
          <p className="mt-1 text-sm text-white/55">Counter.number()</p>
        </div>
        <a
          href={arcExplorerAddress(address)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-emerald-200/80 underline-offset-2 hover:underline"
        >
          Contract <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <p className="mt-3 break-all font-mono text-[10px] text-white/40">{address}</p>
      {!getArcCounterAddress() && (
        <button
          type="button"
          onClick={copyEnvLine}
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-200/80 hover:text-amber-100"
        >
          <Copy className="h-3 w-3" />
          {copied ? "Copied Vercel env line" : "Copy NEXT_PUBLIC_ARC_COUNTER_ADDRESS for Vercel"}
        </button>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          variant="nexus"
          className="arc-btn-pill gap-2"
          disabled={!isConnected || writing || confirming}
          onClick={() => void increment()}
        >
          {(writing || confirming) && <Loader2 className="h-4 w-4 animate-spin" />}
          <Plus className="h-4 w-4" />
          Increment on Arc
        </Button>
        {!isConnected && (
          <span className="text-xs text-white/50">Connect wallet on Arc Testnet</span>
        )}
        {isConnected && !onArc && (
          <span className="text-xs text-amber-200/80">Switch to Arc Testnet</span>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-rose-300/90">{error}</p>}
      {txHash && (
        <p className="mt-3 text-xs text-white/50">
          Tx{" "}
          <a
            href={arcExplorerTx(txHash)}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-200/90 underline"
          >
            {truncateHash(txHash, 10, 8)}
          </a>
          {confirming ? " · confirming…" : isSuccess ? " · confirmed" : ""}
        </p>
      )}
    </div>
  );
}
