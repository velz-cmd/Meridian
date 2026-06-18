import { isGateSymbol } from "@/lib/gate-constants";
import { gateSymbolTradableOnTestnet } from "@/lib/gate-product-copy";
import { canSwapOnBscTestnet } from "@/lib/testnet-onchain";
import { mirrorTestnetForSource } from "@/lib/testnet-chains";

export type HonestTradeMeta = {
  /** True only when PancakeSwap Chapel can settle this row */
  demoTradeable?: boolean;
  chapelDesk?: boolean;
  /** Gate benchmark without Chapel swap (FLOKI, XVS) */
  gateEvalOnly?: boolean;
  suggestedNetwork?: string;
  settlement?: string;
};

function normSym(symbol: string) {
  return symbol.replace(/^\$/, "").trim().toUpperCase();
}

/** Honest tradability — never mark memes/discovery as swappable on Chapel. */
export function applyHonestTradeFlags<T extends { symbol: string; tokenAddress: string; chainId: string }>(
  token: T,
): T & HonestTradeMeta {
  const sym = normSym(token.symbol);
  const chapelDesk = canSwapOnBscTestnet(token);
  const gateEvalOnly = isGateSymbol(sym) && !gateSymbolTradableOnTestnet(sym);

  return {
    ...token,
    demoTradeable: chapelDesk,
    chapelDesk,
    gateEvalOnly,
    suggestedNetwork: chapelDesk ? "bsc-testnet" : mirrorTestnetForSource(token.chainId),
    settlement: chapelDesk ? "BSC Testnet · PancakeSwap V2" : undefined,
  };
}

export function chapelDeskLabel(token: { chapelDesk?: boolean; gateEvalOnly?: boolean; demoTradeable?: boolean }) {
  if (token.chapelDesk || token.demoTradeable) return "Chapel desk";
  if (token.gateEvalOnly) return "CMC gate · eval only";
  return null;
}
