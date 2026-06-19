/**
 * Holder / trader cascade — Birdeye → GMGN → Blockscout → Moralis → DexPaprika pool txs.
 */

import { fetchBirdeyeWhales } from "./birdeye";
import { isBirdeyeUsable } from "./birdeye-client";
import { fetchBlockscoutTopHolders } from "./blockscout-holders";
import { fetchMoralisTopHolders } from "./moralis-holders";
import {
  fetchDexPaprikaPoolTxs,
  fetchDexPaprikaTopPool,
  fetchDexPaprikaToken,
  dexpaprikaNetwork,
} from "./dexpaprika";
import { dexChainIdToGmgn, gmgnTopHolders } from "./gmgn-analytics";
import { hasGmgnApiKey } from "./gmgn-client";
import type { HolderTableRow } from "./nexus-research-dossier";
import type { TokenTx, TokenWhale } from "./storage";

function isRealWalletAddress(addr: string): boolean {
  const a = addr.trim();
  if (!a || a.includes("aggregate") || a.startsWith("flow-") || a.startsWith("dex-")) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(a) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
}

function parseGmgnRows(data: unknown): TokenWhale[] {
  const list =
    (data as { list?: unknown[] })?.list ??
    (data as { holders?: unknown[] })?.holders ??
    (Array.isArray(data) ? data : []);
  if (!Array.isArray(list)) return [];

  return list.slice(0, 12).map((row, i) => {
    const r = row as Record<string, unknown>;
    const address = String(
      r.address ?? r.wallet_address ?? r.owner ?? r.account ?? "",
    );
    let pct = Number(r.amount_percentage ?? r.percentage ?? r.pct ?? r.share ?? 0);
    if (pct > 0 && pct <= 1) pct *= 100;
    const tag = r.tag ?? r.tags;
    const label =
      typeof tag === "string"
        ? tag
        : Array.isArray(tag)
          ? tag.join(", ")
          : typeof r.name === "string"
            ? r.name
            : i === 0
              ? "Top holder"
              : "Whale";
    return { address, balance: 0, pct, label };
  }).filter((w) => isRealWalletAddress(w.address));
}

function tradersFromPoolTxs(txs: TokenTx[]): TokenWhale[] {
  const volByTrader = new Map<string, number>();
  for (const tx of txs) {
    if (!isRealWalletAddress(tx.trader)) continue;
    const key = tx.trader.toLowerCase();
    volByTrader.set(key, (volByTrader.get(key) ?? 0) + tx.amountUsd);
  }
  const total = [...volByTrader.values()].reduce((s, v) => s + v, 0) || 1;
  return [...volByTrader.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([address, vol], i) => ({
      address,
      balance: vol,
      pct: (vol / total) * 100,
      label: i === 0 ? "Top trader" : "Pool trader",
    }));
}

export type HolderCascadeResult = {
  holders: Array<TokenWhale & { rank?: number }>;
  traders: TokenWhale[];
  source: HolderTableRow["source"];
  notes: string[];
};

export async function fetchHolderCascade(
  chainId: string,
  tokenAddress: string,
  opts?: { birdeyeMode?: "off" | "lite" | "full" },
): Promise<HolderCascadeResult> {
  const notes: string[] = [];
  const mode = opts?.birdeyeMode ?? (isBirdeyeUsable() ? "lite" : "off");

  const gmgnChain = dexChainIdToGmgn(chainId);

  const birdeyePromise =
    mode !== "off" && isBirdeyeUsable()
      ? fetchBirdeyeWhales(tokenAddress, chainId, 12)
      : Promise.resolve([] as TokenWhale[]);

  const gmgnPromise =
    hasGmgnApiKey() && gmgnChain
      ? gmgnTopHolders(gmgnChain, tokenAddress, 12).then((res) =>
          res.ok ? parseGmgnRows(res.data) : [],
        )
      : Promise.resolve([] as TokenWhale[]);

  const [birdeyeWhales, gmgnRows, blockscout, moralis, paprikaTxs] = await Promise.all([
    birdeyePromise,
    gmgnPromise,
    fetchBlockscoutTopHolders(chainId, tokenAddress, 12),
    fetchMoralisTopHolders(chainId, tokenAddress, 12),
    (async () => {
      if (!dexpaprikaNetwork(chainId)) return [] as TokenTx[];
      const pool = await fetchDexPaprikaTopPool(chainId, tokenAddress);
      const poolId = pool?.id ?? pool?.address;
      if (!poolId) return [];
      return fetchDexPaprikaPoolTxs(chainId, poolId, 20);
    })(),
  ]);

  if (birdeyeWhales.length) {
    return {
      holders: birdeyeWhales.slice(0, 12).map((w, i) => ({ ...w, rank: i + 1 })),
      traders: birdeyeWhales.filter((w) => /trader/i.test(w.label ?? "")),
      source: "birdeye",
      notes: ["Top holders: Birdeye"],
    };
  }
  if (birdeyeWhales.length === 0 && mode !== "off") notes.push("Birdeye empty or rate-limited");

  if (gmgnRows.length) {
    return {
      holders: gmgnRows.map((w, i) => ({ ...w, rank: i + 1 })),
      traders: [],
      source: "gmgn",
      notes: ["Top holders: GMGN OpenAPI"],
    };
  }
  if (hasGmgnApiKey() && gmgnChain) notes.push("GMGN holders empty for this pair");

  if (blockscout.length) {
    return {
      holders: blockscout.map((w, i) => ({ ...w, rank: i + 1 })),
      traders: tradersFromPoolTxs(paprikaTxs),
      source: "dexpaprika",
      notes: ["Top holders: Blockscout on-chain", ...notes],
    };
  }

  if (moralis.length) {
    return {
      holders: moralis.map((w, i) => ({ ...w, rank: i + 1 })),
      traders: tradersFromPoolTxs(paprikaTxs),
      source: "moralis",
      notes: ["Top holders: Moralis owners", ...notes],
    };
  }

  const traders = tradersFromPoolTxs(paprikaTxs);
  if (traders.length >= 3) {
    return {
      holders: traders.map((w, i) => ({ ...w, rank: i + 1 })),
      traders,
      source: "dexpaprika",
      notes: ["Top holders: inferred from DexPaprika pool swaps", ...notes],
    };
  }

  if (dexpaprikaNetwork(chainId)) {
    const paprika = await fetchDexPaprikaToken(chainId, tokenAddress);
    const h = paprika?.summary?.["24h"];
    if (h && (h.buys ?? 0) + (h.sells ?? 0) > 0) {
      notes.push("DexPaprika flow stats only — no wallet-level holder rows");
    }
  }

  return { holders: [], traders: [], source: "none", notes };
}
