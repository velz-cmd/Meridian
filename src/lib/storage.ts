import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { AgentVaultLedger } from "./agent-vault";
import { emptyLedger } from "./agent-vault";
import type { DemoPosition, DemoTradeRecord } from "./demo-trading";
import { getSupabase } from "./supabase";

export type ReasoningFactor = {
  label: string;
  detail: string;
  impact: "bullish" | "bearish" | "neutral";
  weight: number;
};

export type TokenSocialSnapshot = {
  lunarcrush?: {
    topic?: string;
    galaxyScore?: number;
    altRank?: number;
    sentiment?: number;
    socialVolume24h?: number;
    socialDominance?: number;
    contributors?: number;
    degraded?: boolean;
    reason?: string;
  };
  farcaster?: {
    castCount?: number;
    topCast?: string;
    author?: string;
    degraded?: boolean;
    reason?: string;
  };
  reddit?: {
    postCount?: number;
    topTitle?: string;
    subreddit?: string;
  };
};

export type TokenIntel = {
  marketCap?: number;
  fdv?: number;
  holderCount?: number;
  uniqueWallet24h?: number;
  sniperCount?: number;
  top10HolderPercent?: number;
  buy24h?: number;
  sell24h?: number;
  trade24h?: number;
  isMintable?: boolean;
  isFreezable?: boolean;
  whaleCount?: number;
  sniperWallets?: string[];
  insiderCount?: number;
  technical?: TechnicalSnapshot;
  social?: TokenSocialSnapshot;
};

export type TokenTx = {
  hash?: string;
  type: string;
  side: "buy" | "sell" | "unknown";
  amountUsd: number;
  trader: string;
  timestamp: string;
};

export type TokenWhale = {
  address: string;
  balance: number;
  pct: number;
  label: string;
};

export type TokenInsider = {
  address: string;
  pct: number;
  label: string;
  risk: "high" | "medium" | "low";
};

export type TechnicalSnapshot = {
  rsi: number;
  rsiSignal: string;
  macd: number;
  macdSignal: string;
  trend: string;
  trendLine: string;
  score: number;
  /** birdeye_ohlcv = real candles; dexscreener = Dex % fallback */
  taSource?: string;
};

export type NexusDecision = {
  id: string;
  timestamp: string;
  token: string;
  symbol: string;
  name?: string;
  chainId: string;
  pairAddress?: string;
  dexUrl?: string;
  icon?: string;
  priceUsd: number;
  change24h: number;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  riskScore: number;
  reasoning: string;
  whyAction: string;
  reasoningFactors: ReasoningFactor[];
  deskVerdict?: "AVOID" | "EXIT";
  intel: TokenIntel;
  arcTxHash?: string;
  arcBlockNumber?: number;
  arcFeeTxHash?: string;
  settlementNetwork?: string;
  feeCurrency?: string;
  volume24h?: number;
  liquidityUsd?: number;
  swappable?: boolean;
  swapCriteriaMet?: string[];
  technical?: TechnicalSnapshot;
};

export type { DemoPosition, DemoTradeRecord };

export type AgentSignal = {
  action: "BUY" | "SELL" | "HOLD";
  /** High = confidence in the desk verdict (AVOID/EXIT), not a buy sizing hint */
  confidence: number;
  riskScore: number;
  reasoning: string;
  whyAction: string;
  reasoningFactors: ReasoningFactor[];
  /** Rug/honeypot — show AVOID instead of weak % SELL */
  deskVerdict?: "AVOID" | "EXIT";
};

export type PrismPrediction = {
  id: string;
  timestamp: string;
  event: string;
  category: "macro" | "geopolitical" | "markets";
  probability: number;
  confidence: number;
  kellyFraction: number;
  horizon: string;
  summary: string;
  reasoning: string;
  sources: string[];
  arcTxHash?: string;
};

/** In-memory fallback for Vercel serverless (read-only FS) */
const memoryStore = new Map<string, unknown>();

function getDataDir() {
  if (process.env.VERCEL) return path.join("/tmp", "arc-circle-data");
  return path.join(process.cwd(), ".data");
}

async function ensureDataDir() {
  const dataDir = getDataDir();
  try {
    await mkdir(dataDir, { recursive: true });
  } catch {
    // ignore — memory store still works
  }
  return dataDir;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  if (memoryStore.has(file)) return memoryStore.get(file) as T;

  try {
    const dataDir = await ensureDataDir();
    const raw = await readFile(path.join(dataDir, file), "utf8");
    const parsed = JSON.parse(raw) as T;
    memoryStore.set(file, parsed);
    return parsed;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(file: string, data: T) {
  memoryStore.set(file, data);
  try {
    const dataDir = await ensureDataDir();
    await writeFile(path.join(dataDir, file), JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Vercel: keep in memory for this lambda instance
  }
}

export async function getNexusDecisions(limit = 15) {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("nexus_decisions")
      .select("payload")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data?.length) {
      return data.map((row) => row.payload as NexusDecision);
    }
    if (error) console.warn("Supabase nexus read:", error.message);
  }

  const items = await readJson<NexusDecision[]>("nexus-decisions.json", []);
  return items.slice(0, limit);
}

export async function addNexusDecision(decision: NexusDecision) {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from("nexus_decisions").insert({ payload: decision });
    if (error) console.warn("Supabase nexus insert:", error.message);
    else return decision;
  }

  const items = await readJson<NexusDecision[]>("nexus-decisions.json", []);
  items.unshift(decision);
  await writeJson("nexus-decisions.json", items.slice(0, 200));
  return decision;
}

export async function getPrismPredictions(limit = 50) {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("prism_predictions")
      .select("payload")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data?.length) {
      return data.map((row) => row.payload as PrismPrediction);
    }
    if (error) console.warn("Supabase prism read:", error.message);
  }

  const items = await readJson<PrismPrediction[]>("prism-predictions.json", []);
  return items.slice(0, limit);
}

export async function addPrismPrediction(prediction: PrismPrediction) {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from("prism_predictions").insert({ payload: prediction });
    if (error) console.warn("Supabase prism insert:", error.message);
    else return prediction;
  }

  const items = await readJson<PrismPrediction[]>("prism-predictions.json", []);
  items.unshift(prediction);
  await writeJson("prism-predictions.json", items.slice(0, 200));
  return prediction;
}

type DemoPortfolioStore = {
  positions: DemoPosition[];
  trades: DemoTradeRecord[];
};

async function readDemoPortfolio(wallet: string): Promise<DemoPortfolioStore> {
  const key = wallet.toLowerCase();
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("demo_portfolios")
      .select("positions, trades")
      .eq("wallet", key)
      .maybeSingle();

    if (!error && data) {
      return {
        positions: (data.positions as DemoPosition[]) ?? [],
        trades: (data.trades as DemoTradeRecord[]) ?? [],
      };
    }
    if (error && !error.message.includes("does not exist")) {
      console.warn("Supabase demo portfolio read:", error.message);
    }
  }

  const allPos = await readJson<DemoPosition[]>("demo-positions.json", []);
  const allTrades = await readJson<DemoTradeRecord[]>("demo-trades.json", []);
  return {
    positions: allPos.filter((p) => p.wallet.toLowerCase() === key),
    trades: allTrades.filter((t) => t.wallet.toLowerCase() === key),
  };
}

async function writeDemoPortfolio(wallet: string, positions: DemoPosition[], trades: DemoTradeRecord[]) {
  const key = wallet.toLowerCase();
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from("demo_portfolios").upsert(
      {
        wallet: key,
        positions,
        trades: trades.slice(0, 500),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "wallet" },
    );
    if (!error) {
      await syncDemoPortfolioJson(key, positions, trades);
      return;
    }
    console.warn("Supabase demo portfolio write:", error.message);
  }

  await syncDemoPortfolioJson(key, positions, trades);
}

async function syncDemoPortfolioJson(
  walletKey: string,
  positions: DemoPosition[],
  trades: DemoTradeRecord[],
) {
  const allPos = await readJson<DemoPosition[]>("demo-positions.json", []);
  const allTrades = await readJson<DemoTradeRecord[]>("demo-trades.json", []);
  const othersPos = allPos.filter((p) => p.wallet.toLowerCase() !== walletKey);
  const othersTrades = allTrades.filter((t) => t.wallet.toLowerCase() !== walletKey);
  await writeJson("demo-positions.json", [...positions, ...othersPos].slice(0, 500));
  await writeJson("demo-trades.json", [...trades, ...othersTrades].slice(0, 500));
}

export async function getDemoPositions(wallet: string) {
  const { positions } = await readDemoPortfolio(wallet);
  return positions.filter((p) => p.tokenAmount > 0);
}

export async function getDemoTrades(wallet: string, limit = 30) {
  const { trades } = await readDemoPortfolio(wallet);
  return trades.slice(0, limit);
}

export type GlobalDemoTradeStats = {
  totalTrades: number;
  uniqueWallets: number;
  tradesLast24h: number;
  bscTestnetTrades: number;
  buyCount: number;
  sellCount: number;
  recent: Array<{
    symbol: string;
    side: string;
    wallet: string;
    at: string;
    txHash?: string;
    tradeNetwork: string;
  }>;
};

function aggregateTrades(trades: DemoTradeRecord[]): GlobalDemoTradeStats {
  const wallets = new Set<string>();
  const dayAgo = Date.now() - 86_400_000;
  let tradesLast24h = 0;
  let bscTestnetTrades = 0;
  let buyCount = 0;
  let sellCount = 0;

  for (const t of trades) {
    wallets.add(t.wallet.toLowerCase());
    const at = new Date(t.timestamp).getTime();
    if (at >= dayAgo) tradesLast24h += 1;
    if (t.tradeNetwork === "bsc" || t.sourceChain === "bsc") bscTestnetTrades += 1;
    if (t.side === "buy") buyCount += 1;
    else sellCount += 1;
  }

  const sorted = [...trades].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return {
    totalTrades: trades.length,
    uniqueWallets: wallets.size,
    tradesLast24h,
    bscTestnetTrades,
    buyCount,
    sellCount,
    recent: sorted.slice(0, 12).map((t) => ({
      symbol: t.symbol,
      side: t.side,
      wallet: t.wallet,
      at: t.timestamp,
      txHash: t.arcFeeTxHash?.startsWith("0x") ? t.arcFeeTxHash : undefined,
      tradeNetwork: t.tradeNetwork,
    })),
  };
}

/** Aggregate demo trades across all wallets — Supabase first, then local JSON. */
async function loadAllDemoTrades(): Promise<DemoTradeRecord[]> {
  const supabase = getSupabase();
  const all: DemoTradeRecord[] = [];

  if (supabase) {
    const { data, error } = await supabase
      .from("demo_portfolios")
      .select("trades")
      .limit(200);
    if (!error && data?.length) {
      for (const row of data) {
        const trades = (row.trades as DemoTradeRecord[]) ?? [];
        all.push(...trades);
      }
    }
  }

  if (all.length === 0) {
    all.push(...(await readJson<DemoTradeRecord[]>("demo-trades.json", [])));
  }

  return all;
}

export async function getAllDemoTradesGlobal(): Promise<DemoTradeRecord[]> {
  return loadAllDemoTrades();
}

export async function getGlobalDemoTradeStats(): Promise<GlobalDemoTradeStats> {
  return aggregateTrades(await loadAllDemoTrades());
}

export async function saveDemoTrade(trade: DemoTradeRecord, walletPositions: DemoPosition[]) {
  const { trades } = await readDemoPortfolio(trade.wallet);
  const nextTrades = [trade, ...trades].slice(0, 500);
  await writeDemoPortfolio(trade.wallet, walletPositions, nextTrades);
  return trade;
}

type AgentVaultStore = {
  ledgers: Record<string, AgentVaultLedger>;
  lastScannedBlock?: string;
};

async function readVaultStore(): Promise<AgentVaultStore> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("agent_vault_meta")
      .select("ledgers, last_scanned_block")
      .eq("id", "global")
      .maybeSingle();
    if (!error && data) {
      return {
        ledgers: (data.ledgers as Record<string, AgentVaultLedger>) ?? {},
        lastScannedBlock: data.last_scanned_block ?? undefined,
      };
    }
  }
  return readJson<AgentVaultStore>("agent-vault-ledger.json", { ledgers: {} });
}

async function writeVaultStore(store: AgentVaultStore) {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from("agent_vault_meta").upsert(
      {
        id: "global",
        ledgers: store.ledgers,
        last_scanned_block: store.lastScannedBlock ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (!error) {
      await writeJson("agent-vault-ledger.json", store);
      return;
    }
    console.warn("Supabase agent_vault_meta write:", error.message);
  }
  await writeJson("agent-vault-ledger.json", store);
}

export async function getVaultScanCursor(): Promise<bigint | undefined> {
  const store = await readVaultStore();
  return store.lastScannedBlock ? BigInt(store.lastScannedBlock) : undefined;
}

export async function setVaultScanCursor(block: bigint) {
  const store = await readVaultStore();
  store.lastScannedBlock = block.toString();
  await writeVaultStore(store);
}

export async function getAgentVaultLedger(ownerWallet: string): Promise<AgentVaultLedger> {
  const key = ownerWallet.toLowerCase();
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("agent_vault_ledgers")
      .select("ledger")
      .eq("wallet", key)
      .maybeSingle();
    if (!error && data?.ledger) {
      return data.ledger as AgentVaultLedger;
    }
  }
  const store = await readVaultStore();
  return store.ledgers[key] ?? emptyLedger(ownerWallet);
}

export async function saveAgentVaultLedger(ledger: AgentVaultLedger) {
  const key = ledger.ownerWallet.toLowerCase();
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from("agent_vault_ledgers").upsert(
      {
        wallet: key,
        ledger,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "wallet" },
    );
    if (!error) {
      const store = await readVaultStore();
      store.ledgers[key] = ledger;
      await writeJson("agent-vault-ledger.json", store);
      return ledger;
    }
    console.warn("Supabase agent_vault_ledgers write:", error.message);
  }
  const store = await readVaultStore();
  store.ledgers[key] = ledger;
  await writeVaultStore(store);
  return ledger;
}

export async function creditAgentVault(
  ownerWallet: string,
  amountUsdc: number,
  txHash: string,
): Promise<AgentVaultLedger> {
  const ledger = await getAgentVaultLedger(ownerWallet);
  if (ledger.creditedTxHashes.includes(txHash.toLowerCase())) return ledger;

  ledger.balanceUsdc += amountUsdc;
  ledger.totalDeposited += amountUsdc;
  ledger.creditedTxHashes.push(txHash.toLowerCase());
  ledger.deposits.unshift({
    txHash,
    amountUsdc,
    at: new Date().toISOString(),
  });
  ledger.updatedAt = new Date().toISOString();
  return saveAgentVaultLedger(ledger);
}

export async function debitAgentVault(
  ownerWallet: string,
  amountUsdc: number,
): Promise<AgentVaultLedger> {
  const ledger = await getAgentVaultLedger(ownerWallet);
  if (ledger.balanceUsdc < amountUsdc) {
    throw new Error(`Insufficient agent vault balance (have $${ledger.balanceUsdc.toFixed(2)}, need $${amountUsdc.toFixed(2)})`);
  }
  ledger.balanceUsdc -= amountUsdc;
  ledger.totalSpent += amountUsdc;
  ledger.updatedAt = new Date().toISOString();
  return saveAgentVaultLedger(ledger);
}
