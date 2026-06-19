/**
 * BSC Testnet on-chain stats for BNB Hack analytics — public RPC, no API key.
 */
import { formatEther, isAddress } from "viem";
import { PANCAKE_V2_ROUTER } from "./pancake-v2";
import { BSC_CHAIN_ID, BSC_EXPLORER, getBscPublicClient } from "./bsc-chain";
import { resolveAgentVaultAddress } from "./agent-vault";

export type BnbOnChainTxRow = {
  hash: string;
  blockNumber: number;
  from: string;
  to: string | null;
  valueTbnb: number;
  isPancakeRouter: boolean;
  explorerUrl: string;
};

export type BnbOnChainStats = {
  chainId: number;
  explorer: string;
  vaultAddress: string | null;
  vaultConfigured: boolean;
  vaultTxCount: number | null;
  vaultBalanceTbnb: number | null;
  pancakeRouter: string;
  recentActivity: BnbOnChainTxRow[];
  scannedBlocks: number;
};

const SCAN_BLOCKS = 4000;
const BATCH = BigInt(8);

async function scanAddressActivity(
  address: string,
  latest: bigint,
): Promise<{ rows: BnbOnChainTxRow[]; scannedBlocks: number }> {
  const client = getBscPublicClient();
  const target = address.toLowerCase();
  const router = PANCAKE_V2_ROUTER.toLowerCase();
  const window = BigInt(SCAN_BLOCKS);
  const start = latest > window ? latest - window : BigInt(0);
  const rows: BnbOnChainTxRow[] = [];
  const seen = new Set<string>();

  for (let block = latest; block >= start && rows.length < 12; block -= BATCH) {
    const from = block - BATCH + BigInt(1) > start ? block - BATCH + BigInt(1) : start;
    const nums: bigint[] = [];
    for (let b = block; b >= from; b -= BigInt(1)) nums.push(b);

    const blocks = await Promise.all(
      nums.map((n) =>
        client.getBlock({ blockNumber: n, includeTransactions: true }).catch(() => null),
      ),
    );

    for (const blockRow of blocks) {
      if (!blockRow?.transactions?.length) continue;
      for (const tx of blockRow.transactions) {
        if (typeof tx === "string") continue;
        const fromAddr = tx.from?.toLowerCase() ?? "";
        const toAddr = tx.to?.toLowerCase() ?? null;
        const touches =
          fromAddr === target ||
          toAddr === target ||
          fromAddr === router ||
          toAddr === router;
        if (!touches) continue;
        if (seen.has(tx.hash)) continue;
        seen.add(tx.hash);
        rows.push({
          hash: tx.hash,
          blockNumber: Number(blockRow.number),
          from: tx.from,
          to: tx.to,
          valueTbnb: Number(formatEther(tx.value ?? BigInt(0))),
          isPancakeRouter: fromAddr === router || toAddr === router,
          explorerUrl: `${BSC_EXPLORER}/tx/${tx.hash}`,
        });
        if (rows.length >= 12) break;
      }
    }
  }

  return { rows, scannedBlocks: Number(latest - start) + 1 };
}

export async function fetchBnbOnChainStats(
  vaultOverride?: string | null,
): Promise<BnbOnChainStats> {
  const vaultMeta = resolveAgentVaultAddress();
  const vaultAddress =
    vaultOverride && isAddress(vaultOverride)
      ? vaultOverride
      : vaultMeta.configured
        ? vaultMeta.address
        : null;

  const client = getBscPublicClient();
  const latest = await client.getBlockNumber();

  let vaultTxCount: number | null = null;
  let vaultBalanceTbnb: number | null = null;
  let recentActivity: BnbOnChainTxRow[] = [];
  let scannedBlocks = 0;

  if (vaultAddress) {
    try {
      const [txCount, balance, scan] = await Promise.all([
        client.getTransactionCount({ address: vaultAddress as `0x${string}` }),
        client.getBalance({ address: vaultAddress as `0x${string}` }),
        scanAddressActivity(vaultAddress, latest),
      ]);
      vaultTxCount = Number(txCount);
      vaultBalanceTbnb = Number(formatEther(balance));
      recentActivity = scan.rows;
      scannedBlocks = scan.scannedBlocks;
    } catch {
      /* RPC hiccup — return partial */
    }
  }

  return {
    chainId: BSC_CHAIN_ID,
    explorer: BSC_EXPLORER,
    vaultAddress,
    vaultConfigured: Boolean(vaultAddress),
    vaultTxCount,
    vaultBalanceTbnb,
    pancakeRouter: PANCAKE_V2_ROUTER,
    recentActivity,
    scannedBlocks,
  };
}
