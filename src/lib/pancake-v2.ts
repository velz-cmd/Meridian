import {
  encodeFunctionData,
  formatUnits,
  getAddress,
  isAddress,
  parseEther,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { BSC_TESTNET_WBNB, getBscPublicClient } from "@/lib/bsc-chain";

/** PancakeSwap V2 router — BSC Testnet (Chapel) */
export const PANCAKE_V2_ROUTER = "0xD99D1c33F9fC3444f810f4bE41A671E363a0826" as const;

export const PANCAKE_V2_ROUTER_ABI = [
  {
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    name: "getAmountsOut",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    name: "swapExactETHForTokens",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForETH",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForTokens",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const DEFAULT_SLIPPAGE_BPS = 500; // 5% — testnet pools are thin

export function swapDeadline(secondsFromNow = 1200) {
  return BigInt(Math.floor(Date.now() / 1000) + secondsFromNow);
}

export function minOut(amount: bigint, slippageBps: number) {
  return (amount * BigInt(10_000 - slippageBps)) / BigInt(10_000);
}

export function normalizeTokenAddress(address: string): Address | null {
  try {
    return isAddress(address) ? getAddress(address) : null;
  } catch {
    return null;
  }
}

export async function readTokenDecimals(token: Address): Promise<number> {
  const client = getBscPublicClient();
  try {
    const d = await client.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "decimals",
    });
    return Number(d);
  } catch {
    return 18;
  }
}

export async function quoteSwapAmountsOut(path: Address[], amountIn: bigint): Promise<bigint[] | null> {
  if (path.length < 2 || amountIn <= BigInt(0)) return null;
  const client = getBscPublicClient();
  try {
    const amounts = await client.readContract({
      address: PANCAKE_V2_ROUTER,
      abi: PANCAKE_V2_ROUTER_ABI,
      functionName: "getAmountsOut",
      args: [amountIn, path],
    });
    return amounts as bigint[];
  } catch {
    return null;
  }
}

export async function quoteNativeForToken(
  tokenOut: Address,
  tbnbIn: string,
): Promise<{ amountIn: bigint; amountOut: bigint; path: Address[] } | null> {
  const amountIn = parseEther(tbnbIn);
  const path = [getAddress(BSC_TESTNET_WBNB), tokenOut] as Address[];
  const amounts = await quoteSwapAmountsOut(path, amountIn);
  if (!amounts || amounts.length < 2 || amounts[1] <= BigInt(0)) return null;
  return { amountIn, amountOut: amounts[1], path };
}

export async function quoteTokenForNative(
  tokenIn: Address,
  tokenAmountIn: string,
  decimals = 18,
): Promise<{ amountIn: bigint; amountOut: bigint; path: Address[] } | null> {
  const amountIn = parseUnits(tokenAmountIn, decimals);
  const path = [tokenIn, getAddress(BSC_TESTNET_WBNB)] as Address[];
  const amounts = await quoteSwapAmountsOut(path, amountIn);
  if (!amounts || amounts.length < 2 || amounts[1] <= BigInt(0)) return null;
  return { amountIn, amountOut: amounts[1], path };
}

export async function quoteTokenForToken(
  tokenIn: Address,
  tokenOut: Address,
  tokenAmountIn: string,
  decimalsIn = 18,
): Promise<{ amountIn: bigint; amountOut: bigint; path: Address[] } | null> {
  const amountIn = parseUnits(tokenAmountIn, decimalsIn);
  const direct = [tokenIn, tokenOut] as Address[];
  let amounts = await quoteSwapAmountsOut(direct, amountIn);
  let path = direct;
  if (!amounts || amounts.length < 2 || amounts[1] <= BigInt(0)) {
    path = [tokenIn, getAddress(BSC_TESTNET_WBNB), tokenOut];
    amounts = await quoteSwapAmountsOut(path, amountIn);
  }
  if (!amounts || amounts.length < 2 || amounts[amounts.length - 1] <= BigInt(0)) return null;
  return { amountIn, amountOut: amounts[amounts.length - 1], path };
}

export function encodeSwapNativeForTokens(input: {
  amountOutMin: bigint;
  path: Address[];
  to: Address;
  deadline: bigint;
  value: bigint;
}) {
  const data = encodeFunctionData({
    abi: PANCAKE_V2_ROUTER_ABI,
    functionName: "swapExactETHForTokens",
    args: [input.amountOutMin, input.path, input.to, input.deadline],
  });
  return { to: PANCAKE_V2_ROUTER, data, value: input.value };
}

export function encodeSwapTokensForNative(input: {
  amountIn: bigint;
  amountOutMin: bigint;
  path: Address[];
  to: Address;
  deadline: bigint;
}) {
  const data = encodeFunctionData({
    abi: PANCAKE_V2_ROUTER_ABI,
    functionName: "swapExactTokensForETH",
    args: [input.amountIn, input.amountOutMin, input.path, input.to, input.deadline],
  });
  return { to: PANCAKE_V2_ROUTER, data, value: BigInt(0) };
}

export function encodeSwapTokensForTokens(input: {
  amountIn: bigint;
  amountOutMin: bigint;
  path: Address[];
  to: Address;
  deadline: bigint;
}) {
  const data = encodeFunctionData({
    abi: PANCAKE_V2_ROUTER_ABI,
    functionName: "swapExactTokensForTokens",
    args: [input.amountIn, input.amountOutMin, input.path, input.to, input.deadline],
  });
  return { to: PANCAKE_V2_ROUTER, data, value: BigInt(0) };
}

export function formatTokenUnits(amount: bigint, decimals: number): string {
  const n = Number(formatUnits(amount, decimals));
  if (n >= 1_000_000) return n.toFixed(0);
  if (n >= 1000) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  return n.toExponential(3);
}

export type OnChainSwapTx = {
  to: Address;
  data: Hex;
  value: bigint;
};
