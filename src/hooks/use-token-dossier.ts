"use client";

import { useEffect, useState } from "react";
import { meridianClientHeaders } from "@/lib/circle-agents";
import type { TokenDossierPayload } from "@/lib/nexus-research-dossier";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

const SESSION_PREFIX = "nexus-dossier-v1:";

function readSessionDossier(key: string): TokenDossierPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; payload: TokenDossierPayload };
    if (Date.now() - parsed.at > 120_000) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

function writeSessionDossier(key: string, payload: TokenDossierPayload) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      `${SESSION_PREFIX}${key}`,
      JSON.stringify({ at: Date.now(), payload }),
    );
  } catch {
    /* quota */
  }
}

export function useTokenDossier(token: TrendingMarketToken | null, tier: "feed" | "alpha" = "feed") {
  const cacheKey =
    token?.chainId && token?.tokenAddress
      ? `${token.chainId}:${token.tokenAddress.toLowerCase()}:${tier}`
      : "";

  const [payload, setPayload] = useState<TokenDossierPayload | null>(() =>
    cacheKey ? readSessionDossier(cacheKey) : null,
  );
  const [loading, setLoading] = useState(() => !payload && Boolean(cacheKey));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token?.chainId || !token?.tokenAddress) {
      setPayload(null);
      setLoading(false);
      return;
    }

    const snap = {
      chainId: token.chainId,
      address: token.tokenAddress,
      symbol: token.symbol,
      name: token.name ?? token.symbol,
      pair: token.pairAddress ?? "",
      price: String(token.priceUsd),
      change24h: String(token.change24h),
      volume: String(token.volume24h),
      liquidity: String(token.liquidityUsd ?? 0),
      buys: String(token.txns24h?.buys ?? 0),
      sells: String(token.txns24h?.sells ?? 0),
    };
    const key = `${token.chainId}:${token.tokenAddress.toLowerCase()}:${tier}`;
    const sessionHit = readSessionDossier(key);
    let cancelled = false;

    async function loadDossier(quick: boolean) {
      const params = new URLSearchParams(snap);
      params.set("tier", tier);
      if (quick) params.set("quick", "1");
      else params.set("full", "1");

      const res = await fetch(`/api/nexus/token/dossier?${params}`, {
        headers: meridianClientHeaders(),
        cache: "no-store",
        signal: AbortSignal.timeout(quick ? 28_000 : 58_000),
      });
      const json = await res.json();
      if (cancelled) return;
      if (!res.ok) throw new Error(json.error ?? "Dossier unavailable");
      setPayload(json as TokenDossierPayload);
      writeSessionDossier(key, json as TokenDossierPayload);
      setError(null);
    }

    async function load() {
      if (!sessionHit) {
        setPayload(null);
        setLoading(true);
      }
      setError(null);

      try {
        await loadDossier(tier === "feed");
        if (!cancelled) setLoading(false);

        if (tier === "alpha") return;

        void (async () => {
          try {
            await loadDossier(false);
          } catch {
            /* keep quick dossier */
          } finally {
            if (!cancelled) setLoading(false);
          }
        })();
      } catch (err) {
        if (!cancelled) {
          const raw = err instanceof Error ? err.message : "Failed to load dossier";
          const friendly =
            /timed out|abort|timeout/i.test(raw)
              ? "Extended intel still loading — gate checks and chart use live CMC feed."
              : raw;
          setError(friendly);
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token?.chainId, token?.tokenAddress, tier, cacheKey]);

  return { payload, loading, error };
}
