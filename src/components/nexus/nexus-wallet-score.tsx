"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { Loader2, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BSC_CHAIN_ID } from "@/lib/bsc-chain";
import type { WalletScore } from "@/lib/wallet-score";

export function NexusWalletScoreButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [score, setScore] = useState<WalletScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  async function loadScore(toggle = false) {
    if (!address) return;
    if (toggle && open) {
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        address,
        onBsc: String(chainId === BSC_CHAIN_ID),
      });
      const res = await fetch(`/api/nexus/wallet/score?${params}`);
      const data = await res.json();
      if (res.ok) {
        setScore(data);
        setOpen(true);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [address]);

  if (!isConnected) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Shield className="h-4 w-4" />
        Wallet Score
      </Button>
    );
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button variant="outline" size="sm" onClick={() => loadScore(true)} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
        Wallet Score {score ? `· ${score.grade}` : ""}
      </Button>

      {open && score && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-cyan-400/25 bg-[#0a1018]/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <p className="font-medium">{score.label}</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-cyan-300">{score.grade}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white/70"
                aria-label="Close wallet score"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-1 text-sm text-white/55">Score {score.score}/100</p>
          <div className="mt-3 space-y-2">
            {score.factors.map((f) => (
              <div key={f.label} className="flex justify-between text-xs text-white/60">
                <span>{f.label}</span>
                <span className={f.impact >= 0 ? "text-emerald-300" : "text-rose-300"}>
                  {f.impact >= 0 ? "+" : ""}
                  {f.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function WalletScoreChip({ score }: { score: WalletScore }) {
  const color =
    score.grade === "A" || score.grade === "B"
      ? "text-emerald-300 border-emerald-400/30 bg-emerald-400/10"
      : score.grade === "C"
        ? "text-amber-200 border-amber-400/30 bg-amber-400/10"
        : "text-rose-300 border-rose-400/30 bg-rose-400/10";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${color}`}>
      {score.grade} · {score.score}
    </span>
  );
}
