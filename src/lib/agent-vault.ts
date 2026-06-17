import { privateKeyToAccount } from "viem/accounts";
import { decodeEventLog, formatUnits, isAddress, parseAbiItem } from "viem";
import { getBscPublicClient } from "./bsc-chain";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4c1160f071e847c379df" as const;
const erc20Transfer = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);
const BNB_DECIMALS = 18;

export type AgentVaultMeta = {
  address: string;
  source: "env" | "agent_key" | "circle" | "unconfigured";
  configured: boolean;
};

export type AgentVaultLedger = {
  ownerWallet: string;
  balanceUsdc: number;
  totalDeposited: number;
  totalSpent: number;
  creditedTxHashes: string[];
  deposits: Array<{ txHash: string; amountUsdc: number; at: string }>;
  updatedAt: string;
};

/** Shared deposit address on BSC Testnet — always prefer env so every user sees the same vault */
export function resolveAgentVaultAddress(_circleAddress?: string | null): AgentVaultMeta {
  const envAddr =
    process.env.NEXT_PUBLIC_AGENT_VAULT_ADDRESS ??
    process.env.AGENT_VAULT_ADDRESS ??
    process.env.NEXT_PUBLIC_DEFAULT_AGENT_VAULT;
  if (envAddr && isAddress(envAddr)) {
    return { address: envAddr, source: "env", configured: true };
  }

  const pk = process.env.ARC_AGENT_PRIVATE_KEY ?? process.env.BSC_AGENT_PRIVATE_KEY;
  if (pk?.startsWith("0x")) {
    const account = privateKeyToAccount(pk as `0x${string}`);
    return { address: account.address, source: "agent_key", configured: true };
  }

  return { address: "", source: "unconfigured", configured: false };
}

async function tbnbToDemoUsd(tbnb: number): Promise<number> {
  if (tbnb <= 0) return 0;
  try {
    const { fetchLiveSnapshot } = await import("../../bnb-hack/live/cmc-fetch.mjs");
    const snap = await fetchLiveSnapshot("BNB");
    const px = (snap.price ?? 0) > 0 ? (snap.price ?? 600) : 600;
    return tbnb * px;
  } catch {
    return tbnb * 600;
  }
}

/** Scan native tBNB transfers to the vault from the owner (incremental, capped for serverless) */
export async function scanVaultDeposits(
  ownerWallet: string,
  vaultAddress: string,
  alreadyCredited: string[],
  fromBlock?: bigint,
): Promise<{ deposits: Array<{ txHash: string; amountUsdc: number }>; scannedToBlock: bigint }> {
  const client = getBscPublicClient();
  const owner = ownerWallet.toLowerCase();
  const vault = vaultAddress.toLowerCase();
  const credited = new Set(alreadyCredited.map((h) => h.toLowerCase()));

  const latest = await client.getBlockNumber();
  const maxSpan = BigInt(8000);
  const zero = BigInt(0);
  const windowStart = latest > maxSpan ? latest - maxSpan : zero;
  let start = fromBlock != null ? fromBlock + BigInt(1) : windowStart;
  if (start < windowStart) start = windowStart;
  if (start > latest) start = windowStart;

  const found: Array<{ txHash: string; amountUsdc: number }> = [];
  const batchSize = BigInt(4);

  async function getBlockSafe(blockNumber: bigint) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await client.getBlock({ blockNumber, includeTransactions: true });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (!msg.includes("429") && !msg.includes("Too Many Requests")) throw error;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
    throw new Error(
      "BSC Testnet RPC rate limit (429) — wait a minute and use Credit deposit with your tx hash instead of Sync.",
    );
  }

  for (let batchStart = start; batchStart <= latest; batchStart += batchSize) {
    const batchEnd =
      batchStart + batchSize - BigInt(1) > latest ? latest : batchStart + batchSize - BigInt(1);
    const blockResults = [];
    for (let n = batchStart; n <= batchEnd; n += BigInt(1)) {
      blockResults.push(await getBlockSafe(n));
    }
    for (const block of blockResults) {
      for (const tx of block.transactions) {
        if (typeof tx === "string") continue;
        if (tx.to?.toLowerCase() !== vault) continue;
        if (tx.from?.toLowerCase() !== owner) continue;
        if (!tx.value || tx.value <= BigInt(0)) continue;
        const hash = tx.hash.toLowerCase();
        if (credited.has(hash)) continue;
        const tbnb = Number(formatUnits(tx.value, BNB_DECIMALS));
        if (tbnb < 0.0001) continue;
        const amountUsdc = await tbnbToDemoUsd(tbnb);
        if (amountUsdc < 0.01) continue;
        found.push({ txHash: tx.hash, amountUsdc });
        credited.add(hash);
      }
    }
  }

  return { deposits: found, scannedToBlock: latest };
}

/** Parse native tBNB or ERC-20 Transfer logs in a tx receipt */
export async function extractVaultDepositFromTx(
  ownerWallet: string,
  vaultAddress: string,
  txHash: string,
): Promise<{ amountUsdc: number } | null> {
  const client = getBscPublicClient();
  const hash = txHash.trim() as `0x${string}`;
  const owner = ownerWallet.toLowerCase();
  const vault = vaultAddress.toLowerCase();

  const tx = await client.getTransaction({ hash }).catch(() => null);
  if (tx?.to && tx.from && tx.value > BigInt(0)) {
    if (tx.to.toLowerCase() === vault && tx.from.toLowerCase() === owner) {
      const tbnb = Number(formatUnits(tx.value, BNB_DECIMALS));
      const amountUsdc = await tbnbToDemoUsd(tbnb);
      if (amountUsdc >= 0.01) return { amountUsdc };
    }
  }

  const receipt = await client.getTransactionReceipt({ hash }).catch(() => null);
  if (!receipt) return null;

  let totalTbnb = 0;
  for (const log of receipt.logs) {
    if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
    try {
      const decoded = decodeEventLog({
        abi: [erc20Transfer],
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "Transfer") continue;
      const { from, to, value } = decoded.args;
      if (from.toLowerCase() !== owner || to.toLowerCase() !== vault) continue;
      totalTbnb += Number(formatUnits(value, BNB_DECIMALS));
    } catch {
      /* skip non-standard logs */
    }
  }

  if (totalTbnb >= 0.0001) {
    const amountUsdc = await tbnbToDemoUsd(totalTbnb);
    if (amountUsdc >= 0.01) return { amountUsdc };
  }
  return null;
}

/** Verify a single deposit transaction and return credited amount */
export async function verifyVaultDepositTx(
  ownerWallet: string,
  vaultAddress: string,
  txHash: string,
): Promise<{ amountUsdc: number } | null> {
  return extractVaultDepositFromTx(ownerWallet, vaultAddress, txHash);
}

export function emptyLedger(ownerWallet: string): AgentVaultLedger {
  return {
    ownerWallet: ownerWallet.toLowerCase(),
    balanceUsdc: 0,
    totalDeposited: 0,
    totalSpent: 0,
    creditedTxHashes: [],
    deposits: [],
    updatedAt: new Date().toISOString(),
  };
}
