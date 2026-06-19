import { BSC_CHAIN_LABEL } from "@/lib/bsc-chain";

/** Settlement layer for all MERIDIAN trade surfaces (buy · sell · swap · autopilot). */
export const TRADING_SETTLEMENT = {
  chainLabel: BSC_CHAIN_LABEL,
  nativeSymbol: "tBNB",
  dex: "PancakeSwap V2",
  faucetUrl: "https://testnet.bnbchain.org/faucet-smart",
  deskSymbols: ["BNB", "CAKE", "BUSD", "USDC"] as const,
} as const;

export const TRADING_TAGLINE =
  "Gate benchmarks use live CMC skills · Chapel swaps (BNB/CAKE/BUSD/USDC) sign in your wallet on BSC Testnet.";

export const TRADING_WALLET_HINT = `Connect on ${BSC_CHAIN_LABEL} · fund tBNB · wallet signs each PancakeSwap tx.`;

export const TRADING_AUTOPILOT_HINT =
  "Manual: Buy/Sell tabs. Autopilot: set timeframe + trade count — agent reads live CMC, pulse, funding. Spot = Chapel; futures = leverage signals.";

export const TRADING_MANUAL_HINT =
  "You control size and timing — one wallet signature per swap on Chapel.";

export const TRADING_PORTFOLIO_SUB =
  "BSC Testnet wallet · on-chain balances · marked with live feed prices";

export function formatTbnbWithUsd(tbnb: number, bnbSpotUsd: number): string {
  const usd = tbnb * bnbSpotUsd;
  return `${tbnb.toFixed(4)} tBNB (~$${usd.toFixed(2)})`;
}

export function usdToTbnb(usd: number, bnbSpotUsd: number): number {
  if (bnbSpotUsd <= 0) return 0;
  return usd / bnbSpotUsd;
}
