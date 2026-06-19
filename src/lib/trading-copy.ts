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
  "Live CMC gate data · FLOKI/XVS route to Chapel proxies · wallet signs each PancakeSwap tx on BSC Testnet.";

export const TRADING_WALLET_HINT = `Connect on ${BSC_CHAIN_LABEL} · fund tBNB · wallet signs each PancakeSwap tx.`;

export const TRADING_AUTOPILOT_HINT =
  "Autopilot checks live CMC + pulse on your interval — spot & futures modes sign real Chapel swaps when rules pass.";

export const TRADING_MANUAL_HINT =
  "Manual mode — you pick size; wallet signs one Chapel swap per click.";

export const TRADING_PORTFOLIO_SUB =
  "BSC Testnet wallet · on-chain balances · tx history verified on Chapel";

export function formatTbnbWithUsd(tbnb: number, bnbSpotUsd: number): string {
  const usd = tbnb * bnbSpotUsd;
  return `${tbnb.toFixed(4)} tBNB (~$${usd.toFixed(2)})`;
}

export function usdToTbnb(usd: number, bnbSpotUsd: number): number {
  if (bnbSpotUsd <= 0) return 0;
  return usd / bnbSpotUsd;
}
