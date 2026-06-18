"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { NexusTokenAvatar } from "@/components/nexus/nexus-token-avatar";
import { useToast } from "@/components/ui/toast-provider";
import { BSC_CHAIN_ID } from "@/lib/bsc-chain";
import { usdToTbnb } from "@/lib/trading-copy";
import { useBnbSpotUsd } from "@/hooks/use-bnb-spot-usd";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { formatPct, formatUsd } from "@/lib/utils";

type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatAction = {
  type: string;
  usdAmount?: number;
  usdcAmount?: number;
};

type LiveChatSnapshot = {
  symbol: string;
  priceUsd: number;
  change24h: number;
  action?: string;
  confidence?: number;
  reasoningHeadline?: string;
  refreshedAt?: string;
};

function introFromSnapshot(snap: LiveChatSnapshot | null, token: TrendingMarketToken) {
  if (snap) {
    const move = formatPct(snap.change24h);
    const sig = snap.action ? `${snap.action} ${snap.confidence ?? ""}%` : "HOLD";
    return `Live ${snap.symbol}: ${formatUsd(snap.priceUsd)} (${move} 24h). Signal ${sig}. ${snap.reasoningHeadline ?? "Ask fundamentals, risks, or say buy $10 tBNB / sell / autopilot."}`;
  }
  const a = token.agent;
  return `Loading live ${token.symbol} data… Ask fundamentals, why ${a?.action ?? "HOLD"} ${a?.confidence ?? ""}%, risks, or say "buy 0.01 tBNB", "sell", "autopilot every 15 min".`;
}

export function NexusTokenChatButton({
  token,
  onOpenTrade,
  className = "",
}: {
  token: TrendingMarketToken;
  onOpenTrade?: (tab: "buy" | "sell" | "agent") => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-violet-400/35 bg-violet-500/15 px-2.5 text-[11px] font-bold text-violet-100 transition hover:bg-violet-500/25 active:scale-95 ${className}`}
        aria-label={`Chat about ${token.symbol}`}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Chat
      </button>
      {open && (
        <NexusTokenChatPanel
          token={token}
          onClose={() => setOpen(false)}
          onOpenTrade={onOpenTrade}
        />
      )}
    </>
  );
}

export function NexusTokenChatPanel({
  token,
  onClose,
  onOpenTrade,
}: {
  token: TrendingMarketToken;
  onClose: () => void;
  onOpenTrade?: (tab: "buy" | "sell" | "agent") => void;
}) {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address, chainId: BSC_CHAIN_ID });
  const walletTbnb = balance ? Number(balance.formatted) : 0;
  const bnbSpotUsd = useBnbSpotUsd();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(true);
  const [liveSnap, setLiveSnap] = useState<LiveChatSnapshot | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: introFromSnapshot(null, token) },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setContextLoading(true);
    setLiveSnap(null);
    setMessages([{ role: "assistant", content: introFromSnapshot(null, token) }]);

    const q = new URLSearchParams({
      chainId: token.chainId,
      tokenAddress: token.tokenAddress,
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14_000);
    void fetch(`/api/nexus/chat/context?${q}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load live token data");
        if (cancelled) return;
        const snap: LiveChatSnapshot = {
          symbol: data.symbol,
          priceUsd: data.priceUsd,
          change24h: data.change24h,
          action: data.action,
          confidence: data.confidence,
          reasoningHeadline: data.reasoningHeadline,
          refreshedAt: data.refreshedAt,
        };
        setLiveSnap(snap);
        setMessages([{ role: "assistant", content: introFromSnapshot(snap, token) }]);
      })
      .catch((e) => {
        if (cancelled) return;
        const aborted = e instanceof Error && e.name === "AbortError";
        setMessages([
          {
            role: "assistant",
            content: aborted
              ? `${token.symbol}: using feed snapshot (server busy). ${introFromSnapshot(null, token)}`
              : `Could not refresh ${token.symbol} — ${e instanceof Error ? e.message : "error"}. You can still ask; replies use latest feed data.`,
          },
        ]);
      })
      .finally(() => {
        clearTimeout(timer);
        if (!cancelled) setContextLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [token.tokenAddress, token.chainId, token.symbol]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setLoading(true);
    try {
      const res = await fetch("/api/nexus/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          walletConnected: isConnected,
          walletTbnb,
          token: {
            symbol: token.symbol,
            chainId: token.chainId,
            tokenAddress: token.tokenAddress,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chat failed");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);

      const action = data.action as ChatAction | null;
      if (action?.type === "buy") {
        onOpenTrade?.("buy");
        const usd = action.usdAmount ?? action.usdcAmount;
        const tbnb = usd ? usdToTbnb(usd, bnbSpotUsd) : undefined;
        toast({
          type: "success",
          title: "Buy tab",
          message: tbnb
            ? `Try ${tbnb.toFixed(4)} tBNB${usd ? ` (~$${usd})` : ""}`
            : "Set tBNB amount and confirm in wallet",
        });
      } else if (action?.type === "sell") onOpenTrade?.("sell");
      else if (action?.type === "autopilot") onOpenTrade?.("agent");
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Sorry — ${e instanceof Error ? e.message : "error"}. Try again.` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, isConnected, walletTbnb, bnbSpotUsd, token, onOpenTrade, toast]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-3"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-[min(92dvh,100%)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-violet-400/35 bg-[#0a0f1a] shadow-2xl sm:h-auto sm:max-h-[min(520px,85vh)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Chat about ${token.symbol}`}
      >
        <div className="flex items-center gap-2 border-b border-violet-400/20 px-3 py-2.5">
          <NexusTokenAvatar symbol={token.symbol} icon={token.icon} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{token.symbol} Copilot</p>
            <p className="truncate text-[10px] text-white/50">
              {contextLoading
                ? "Refreshing live market data…"
                : liveSnap
                  ? `${formatUsd(liveSnap.priceUsd)} · ${formatPct(liveSnap.change24h)} · ${liveSnap.action ?? "—"}`
                  : "Text-only intel — no charts in chat"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[92%] rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? "ml-auto bg-violet-500/25 text-violet-50" : "bg-white/8 text-white/85"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <Bot className="h-3.5 w-3.5" />
              Verifying live {token.symbol} data…
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-2">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void send()}
              placeholder={`Why ${token.symbol}? Or "buy 0.01 tBNB"…`}
              disabled={contextLoading}
              className="min-h-[44px] flex-1 rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-white outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading || contextLoading || !input.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500 text-white disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
