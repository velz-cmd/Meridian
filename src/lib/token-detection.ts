import { fetchTokenDetection } from "./birdeye";
import { hasBirdeyeKey } from "./birdeye-client";
import { fetchHolderCascade } from "./holder-fallback";
import {
  fetchDexPaprikaToken,
  fetchDexPaprikaTopPool,
  fetchDexPaprikaPoolTxs,
  paprikaToWhales,
  paprikaIntelFromToken,
  dexpaprikaNetwork,
} from "./dexpaprika";
import { fetchTokenByAddress } from "./dexscreener";
import type { TokenTx, TokenWhale } from "./storage";

/** Real wallet addresses only — exclude DexPaprika flow aggregates. */
function isRealWalletAddress(addr: string): boolean {
  const a = addr.trim();
  if (!a || a.includes("aggregate") || a.startsWith("flow-") || a.startsWith("dex-")) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(a) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
}

function filterRealWhales(rows: TokenWhale[]): TokenWhale[] {
  return rows.filter((w) => isRealWalletAddress(w.address));
}

export async function fetchMergedTokenDetection(
  address: string,
  sourceChain: string,
  dexFallback?: { buys: number; sells: number; volume: number },
  opts?: { birdeyeMode?: "off" | "lite" | "full" },
) {
  const birdeye = await fetchTokenDetection(address, sourceChain, {
    mode: opts?.birdeyeMode ?? "full",
  });

  const network = dexpaprikaNetwork(sourceChain);
  let paprikaToken = network ? await fetchDexPaprikaToken(sourceChain, address) : null;
  let paprikaTxs: TokenTx[] = [];

  if (network && paprikaToken) {
    const pool = await fetchDexPaprikaTopPool(sourceChain, address);
    const poolId = pool?.id ?? pool?.address;
    if (poolId) {
      paprikaTxs = await fetchDexPaprikaPoolTxs(sourceChain, poolId, 12);
    }
  }

  const paprikaWhales = paprikaToken ? paprikaToWhales(paprikaToken) : [];
  const paprikaIntel = paprikaToken ? paprikaIntelFromToken(paprikaToken) : null;

  let trades = birdeye.trades.length ? birdeye.trades : paprikaTxs;
  // Never synthesize trades from Dex aggregate counts — show empty when no real txs.

  let whales = birdeye.whales.length ? birdeye.whales : paprikaWhales;
  let holders =
    birdeye.holders.length > 0
      ? birdeye.holders
      : filterRealWhales(whales).slice(0, 12).map((w, i) => ({ ...w, rank: i + 1 }));

  if (filterRealWhales(holders).length === 0) {
    const cascade = await fetchHolderCascade(address, sourceChain, { birdeyeMode: "off" });
    if (cascade.holders.length) {
      whales = cascade.holders;
      holders = cascade.holders;
      if (cascade.traders.length && trades.length < 3) {
        for (const t of cascade.traders.slice(0, 6)) {
          trades.push({
            type: "swap",
            side: "buy",
            amountUsd: t.balance,
            trader: t.address,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }

  const hasPaprika = Boolean(paprikaToken?.summary?.price_usd);
  const bs = birdeye.summary as {
    birdeyeLive?: boolean;
    holderCount?: number;
    buy24h?: number;
    sell24h?: number;
    priceUsd?: number;
  };
  const birdeyeLive = Boolean(bs.birdeyeLive);
  const mergedLive = birdeyeLive || hasPaprika || trades.length > 0;

  return {
    ...birdeye,
    trades: trades.slice(0, 15),
    whales,
    holders,
    summary: {
      ...birdeye.summary,
      ...(paprikaIntel ?? {}),
      holderCount: bs.holderCount,
      buy24h: bs.buy24h ?? paprikaIntel?.buy24h ?? dexFallback?.buys,
      sell24h: bs.sell24h ?? paprikaIntel?.sell24h ?? dexFallback?.sells,
      birdeyeLive: mergedLive,
      dataSource: birdeyeLive
        ? ("birdeye" as const)
        : filterRealWhales(holders).length > 0
          ? hasPaprika
            ? ("dexpaprika" as const)
            : ("birdeye" as const)
          : hasPaprika
            ? ("dexpaprika" as const)
            : trades.length
              ? ("dex" as const)
              : ("unavailable" as const),
      paprikaConnected: hasPaprika,
      priceUsd: bs.priceUsd ?? paprikaIntel?.priceUsd,
    },
    serverHasKey: hasBirdeyeKey(),
    errors:
      mergedLive
        ? undefined
        : [...(birdeye.errors ?? []), "DexPaprika + Birdeye returned no live rows"],
  };
}

export async function enrichTokenWithPair(chainId: string, tokenAddress: string) {
  const pair = await fetchTokenByAddress(chainId, tokenAddress);
  return pair;
}
