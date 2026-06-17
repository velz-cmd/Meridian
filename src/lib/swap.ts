import { getAddress, isAddress, parseUnits } from "viem";

const ZEROX_BASE = "https://api.0x.org";

const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  polygon: 137,
  bsc: 56,
  "bsc-testnet": 97,
};

export function evmChainId(chainId: string) {
  return CHAIN_IDS[chainId.toLowerCase()];
}

export function isEvmChain(chainId: string) {
  return Boolean(evmChainId(chainId));
}

export async function fetchZeroXQuote(input: {
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  taker: string;
  slippageBps?: number;
}) {
  const apiKey = process.env.ZEROX_API_KEY;
  if (!apiKey) {
    return { demo: true as const, message: "Add ZEROX_API_KEY for live swap quotes" };
  }

  const params = new URLSearchParams({
    chainId: String(input.chainId),
    sellToken: input.sellToken,
    buyToken: input.buyToken,
    sellAmount: input.sellAmount,
    taker: input.taker,
    slippageBps: String(input.slippageBps ?? 100),
  });

  const res = await fetch(`${ZEROX_BASE}/swap/permit2/quote?${params}`, {
    headers: { "0x-api-key": apiKey, "0x-version": "v2" },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`0x quote failed: ${text}`);
  }

  return { demo: false as const, ...(await res.json()) };
}

export function validateEvmAddress(address: string) {
  try {
    return isAddress(address) ? getAddress(address) : null;
  } catch {
    return null;
  }
}

export function toSellAmount(amount: string, decimals = 18) {
  return parseUnits(amount, decimals).toString();
}
