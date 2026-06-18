import { getBscPublicClient } from "@/lib/bsc-chain";
import { BORACLE_TESTNET_FEEDS, isBoracleGateSymbol } from "@/lib/boracle-testnet-feeds";
import type { GateSymbol } from "@/lib/gate-constants";

const AGGREGATOR_ABI = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

export type BoraclePriceSnapshot = {
  symbol: GateSymbol;
  pair: string;
  priceUsd: number;
  decimals: number;
  updatedAt: number;
  ageHours: number;
  stale: boolean;
  adapter: `0x${string}`;
  spaceId: string;
  source: "boracle-bsc-testnet";
};

/** Testnet feeds may lag — flag stale when last on-chain update is older than 36h */
const STALE_AFTER_HOURS = 36;

export async function fetchBoracleUsdPrice(symbol: string): Promise<BoraclePriceSnapshot | null> {
  const sym = symbol.toUpperCase();
  if (!isBoracleGateSymbol(sym)) return null;

  const feed = BORACLE_TESTNET_FEEDS[sym];
  const client = getBscPublicClient();

  try {
    const [round, decimals] = await Promise.all([
      client.readContract({
        address: feed.adapter,
        abi: AGGREGATOR_ABI,
        functionName: "latestRoundData",
      }),
      client.readContract({
        address: feed.adapter,
        abi: AGGREGATOR_ABI,
        functionName: "decimals",
      }),
    ]);

    const answer = round[1];
    if (Number(answer) <= 0) return null;

    const priceUsd = Number(answer) / 10 ** decimals;
    const updatedAt = Number(round[3]);
    const ageHours = Math.max(0, (Date.now() / 1000 - updatedAt) / 3600);

    return {
      symbol: sym,
      pair: feed.pair,
      priceUsd,
      decimals,
      updatedAt,
      ageHours: Math.round(ageHours * 10) / 10,
      stale: ageHours > STALE_AFTER_HOURS,
      adapter: feed.adapter,
      spaceId: feed.spaceId,
      source: "boracle-bsc-testnet",
    };
  } catch {
    return null;
  }
}

export async function fetchBoracleGatePrices(): Promise<Partial<Record<GateSymbol, BoraclePriceSnapshot>>> {
  const symbols = Object.keys(BORACLE_TESTNET_FEEDS) as GateSymbol[];
  const rows = await Promise.all(symbols.map((s) => fetchBoracleUsdPrice(s)));
  const out: Partial<Record<GateSymbol, BoraclePriceSnapshot>> = {};
  for (const row of rows) {
    if (row) out[row.symbol] = row;
  }
  return out;
}

export function oracleCmcDeltaPct(oracleUsd: number, cmcUsd: number): number | null {
  if (!oracleUsd || !cmcUsd) return null;
  return Math.round(((cmcUsd - oracleUsd) / oracleUsd) * 1000) / 10;
}
