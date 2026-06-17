"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { ArrowDownUp, ChevronDown, ExternalLink, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { useBnbSettlement } from "@/hooks/use-bnb-settlement";
import { BSC_CHAIN_LABEL } from "@/lib/bsc-chain";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";
import { filterTradableTokens } from "@/lib/token-filters";
import { formatUsd } from "@/lib/utils";
import type { DemoPosition } from "@/lib/storage";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

const PCT_OPTIONS = [25, 50, 75, 100] as const;

function TokenPicker({
  label,
  value,
  onChange,
  tokens,
  balanceHint,
}: {
  label: string;
  value: string;
  onChange: (addr: string) => void;
  tokens: TrendingMarketToken[];
  balanceHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = tokens.find((t) => t.tokenAddress === value);

  return (
    <div className="relative">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-1 flex w-full min-h-[48px] items-center gap-2.5 rounded-xl border border-white/15 bg-black/45 px-3 text-left transition hover:border-cyan-400/35"
      >
        {selected?.icon ? (
          <img src={selected.icon} alt="" className="h-8 w-8 shrink-0 rounded-lg border border-white/10" />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-xs font-bold text-cyan-200">
            {selected?.symbol.slice(0, 2) ?? "—"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {selected ? selected.symbol : "Select token"}
          </p>
          <p className="truncate text-[11px] text-white/50">
            {selected ? formatUsd(selected.priceUsd) : "—"}
            {balanceHint ? ` · ${balanceHint}` : ""}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/50 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-white/15 bg-[#0a1220] py-1 shadow-xl">
          {tokens.map((t) => (
            <button
              key={t.tokenAddress}
              type="button"
              onClick={() => {
                onChange(t.tokenAddress);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/5"
            >
              {t.icon ? (
                <img src={t.icon} alt="" className="h-7 w-7 rounded-lg border border-white/10" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-[10px] font-bold">
                  {t.symbol.slice(0, 2)}
                </div>
              )}
              <span className="text-sm font-medium text-white">{t.symbol}</span>
              <span className="ml-auto text-xs text-white/45">{formatUsd(t.priceUsd)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function NexusAbSwap({
  tokens,
  onComplete,
  defaultOpen = false,
}: {
  tokens: TrendingMarketToken[];
  onComplete?: () => void;
  defaultOpen?: boolean;
}) {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { payBnbFee, ensureBscNetwork, isPending: bnbPending } = useBnbSettlement();
  const tradable = useMemo(() => filterTradableTokens(tokens), [tokens]);

  const [tokenA, setTokenA] = useState("");
  const [tokenB, setTokenB] = useState("");
  const [amountA, setAmountA] = useState("");
  const [amountMode, setAmountMode] = useState<"token" | "usdc">("token");
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<DemoPosition[]>([]);

  const loadPortfolio = useCallback(async () => {
    if (!address) return;
    const res = await fetch(`/api/nexus/demo/portfolio?wallet=${address}&t=${Date.now()}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (res.ok) setPositions(data.positions ?? []);
  }, [address]);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  useEffect(() => {
    if (!tokenA && tradable[0]) setTokenA(tradable[0].tokenAddress);
    if (!tokenB && tradable[1]) setTokenB(tradable[1].tokenAddress);
  }, [tradable, tokenA, tokenB]);

  const a = tradable.find((t) => t.tokenAddress === tokenA);
  const b = tradable.find((t) => t.tokenAddress === tokenB);
  const posA = positions.find((p) => p.tokenAddress.toLowerCase() === tokenA.toLowerCase());
  const balanceA = posA?.tokenAmount ?? 0;

  const amountNum = Math.max(0, Number(amountA) || 0);
  const tokenAmountSell =
    amountMode === "usdc" && a && a.priceUsd > 0 ? amountNum / a.priceUsd : amountNum;
  const estB =
    a && b && a.priceUsd > 0 && b.priceUsd > 0
      ? (tokenAmountSell * a.priceUsd) / b.priceUsd
      : 0;
  const notionalUsd = tokenAmountSell * (a?.priceUsd ?? 0);

  function applyPct(pct: number) {
    if (amountMode === "token") {
      if (balanceA <= 0) {
        toast({ type: "error", title: "No balance", message: `You hold 0 ${a?.symbol ?? "token A"}` });
        return;
      }
      setAmountA(((balanceA * pct) / 100).toFixed(pct === 100 ? 6 : 4));
      return;
    }
    const maxUsdc = balanceA * (a?.priceUsd ?? 0);
    if (maxUsdc <= 0) {
      toast({ type: "error", title: "No balance", message: "Sell leg needs token A in portfolio" });
      return;
    }
    setAmountA(((maxUsdc * pct) / 100).toFixed(2));
  }

  async function executeSwap() {
    if (!a || !b || !address) {
      toast({ type: "error", title: "Select tokens", message: "Pick token A and token B" });
      return;
    }
    if (a.tokenAddress.toLowerCase() === b.tokenAddress.toLowerCase()) {
      toast({ type: "error", title: "Same token", message: "Choose two different tokens" });
      return;
    }
    if (tokenAmountSell <= 0) {
      toast({ type: "error", title: "Amount", message: "Enter a valid amount" });
      return;
    }
    if (tokenAmountSell > balanceA + 1e-9) {
      toast({
        type: "error",
        title: "Insufficient balance",
        message: `You have ${balanceA.toFixed(4)} ${a.symbol}`,
      });
      return;
    }

    setLoading(true);
    try {
      await ensureBscNetwork();
      const fee = await payBnbFee("SWAP_AB", `${a.tokenAddress}-${b.tokenAddress}-${Date.now()}`);

      const sellRes = await fetch("/api/nexus/demo/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          side: "sell",
          symbol: a.symbol,
          tokenAddress: a.tokenAddress,
          sourceChain: a.chainId,
          tradeNetwork: "bsc",
          tokenAmount: tokenAmountSell,
          priceUsd: a.priceUsd,
          arcFeeTxHash: fee.txHash,
        }),
      });
      const sellData = await sellRes.json();
      if (!sellRes.ok) throw new Error(sellData.error ?? "Sell leg failed");

      const usdcOut = sellData.trade?.usdcAmount ?? tokenAmountSell * a.priceUsd;
      const buyRes = await fetch("/api/nexus/demo/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          side: "buy",
          symbol: b.symbol,
          tokenAddress: b.tokenAddress,
          sourceChain: b.chainId,
          tradeNetwork: "bsc",
          usdcAmount: usdcOut,
          priceUsd: b.priceUsd,
          arcFeeTxHash: fee.txHash,
        }),
      });
      const buyData = await buyRes.json();
      if (!buyRes.ok) throw new Error(buyData.error ?? "Buy leg failed");

      toast({
        type: "success",
        title: "Swap recorded",
        message: `Sold ${tokenAmountSell.toFixed(4)} ${a.symbol} → ~${(buyData.trade?.tokenAmount ?? estB).toFixed(4)} ${b.symbol}`,
      });
      await loadPortfolio();
      onComplete?.();
    } catch (e) {
      toast({
        type: "error",
        title: "Swap failed",
        message: e instanceof Error ? e.message : "Could not complete swap",
      });
    } finally {
      setLoading(false);
    }
  }

  const balanceHintA =
    a && balanceA > 0
      ? `Bal ${balanceA.toFixed(4)} ${a.symbol}`
      : a
        ? "Bal 0"
        : undefined;

  return (
    <NexusCollapsible
      label="Token swap (A → B)"
      hint={a && b ? `${a.symbol} → ${b.symbol} · demo ${BSC_CHAIN_LABEL} portfolio` : "Sell A, buy B"}
      variant="technical"
      icon={ArrowDownUp}
      defaultOpen={defaultOpen}
    >
      <div className="space-y-3">
        <p className="text-[11px] text-white/50">
          Uses your demo portfolio holdings on {BSC_CHAIN_LABEL}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <TokenPicker
            label="From (A)"
            value={tokenA}
            onChange={setTokenA}
            tokens={tradable}
            balanceHint={balanceHintA}
          />
          <TokenPicker
            label="To (B)"
            value={tokenB}
            onChange={setTokenB}
            tokens={tradable.filter((t) => t.tokenAddress !== tokenA)}
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/45">Amount</span>
            <div className="inline-flex rounded-lg border border-white/15 p-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setAmountMode("token")}
                className={`rounded-md px-2.5 py-1 transition ${
                  amountMode === "token" ? "bg-cyan-500/25 text-cyan-100" : "text-white/50"
                }`}
              >
                {a?.symbol ?? "Token"}
              </button>
              <button
                type="button"
                onClick={() => setAmountMode("usdc")}
                className={`rounded-md px-2.5 py-1 transition ${
                  amountMode === "usdc" ? "bg-emerald-500/25 text-emerald-100" : "text-white/50"
                }`}
              >
                tBNB
              </button>
            </div>
          </div>

          {a && (
            <p className="mb-2 flex items-center gap-1.5 text-[11px] text-white/55">
              <Wallet className="h-3.5 w-3.5 text-cyan-300/80" />
              Available: <strong className="text-white">{balanceA.toFixed(4)}</strong> {a.symbol}
              {balanceA > 0 && a.priceUsd > 0 && (
                <span className="text-white/40">≈ {formatUsd(balanceA * a.priceUsd)}</span>
              )}
            </p>
          )}

          <input
            type="text"
            inputMode="decimal"
            value={amountA}
            onChange={(e) => setAmountA(e.target.value)}
            placeholder={amountMode === "usdc" ? "tBNB notional" : "Token amount"}
            className="w-full min-h-[44px] rounded-xl border border-white/15 bg-black/40 px-3 text-lg font-medium text-white outline-none focus:border-cyan-400/40"
          />

          <div className="mt-2 grid grid-cols-5 gap-1.5">
            <button
              type="button"
              onClick={() => applyPct(100)}
              className="min-h-[36px] rounded-lg border border-violet-400/30 bg-violet-500/15 text-xs font-bold text-violet-100"
            >
              MAX
            </button>
            {PCT_OPTIONS.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => applyPct(pct)}
                className="min-h-[36px] rounded-lg border border-white/12 bg-white/5 text-xs font-semibold text-white/75 hover:bg-white/10"
              >
                {pct}%
              </button>
            ))}
          </div>

          {a && b && amountNum > 0 && (
            <p className="mt-2 text-xs text-cyan-100/85">
              Sell ≈ {tokenAmountSell.toFixed(6)} {a.symbol} ({formatUsd(notionalUsd)}) → receive ≈{" "}
              {estB.toFixed(6)} {b.symbol}
            </p>
          )}
        </div>

        {isConnected ? (
          <Button
            variant="nexus"
            className="min-h-[48px] w-full"
            disabled={loading || bnbPending || !a || !b || balanceA <= 0}
            onClick={() => void executeSwap()}
          >
            {loading || bnbPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Swap {a?.symbol ?? "A"} → {b?.symbol ?? "B"}
          </Button>
        ) : (
          <p className="text-center text-xs text-white/50">Connect wallet on {BSC_CHAIN_LABEL} to swap</p>
        )}

        {a?.url && (
          <a
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1 text-[11px] text-white/45 hover:text-cyan-200"
          >
            Market chart <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </NexusCollapsible>
  );
}
