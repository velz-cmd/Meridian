import { isGateSymbol } from "@/lib/gate-constants";
import { gateSymbolTradableOnTestnet } from "@/lib/gate-product-copy";
import { chapelProxySymbol, hasChapelExecutionRoute } from "@/lib/chapel-execution-router";
import { canSwapOnBscTestnet } from "@/lib/testnet-onchain";
import { mirrorTestnetForSource } from "@/lib/testnet-chains";

export type HonestTradeMeta = {
  /** True when Chapel can settle (direct or routed gate proxy) */
  demoTradeable?: boolean;
  chapelDesk?: boolean;
  /** Gate benchmark routed to Chapel proxy (FLOKI→CAKE, XVS→BNB) */
  chapelRouted?: boolean;
  chapelRouteLabel?: string;
  /** @deprecated use chapelRouted */
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
  const proxy = chapelProxySymbol(sym);
  const chapelRouted = Boolean(isGateSymbol(sym) && proxy && proxy !== sym);
  const chapelDesk = canSwapOnBscTestnet(token) || hasChapelExecutionRoute(sym);
  const gateEvalOnly = isGateSymbol(sym) && !gateSymbolTradableOnTestnet(sym);

  return {
    ...token,
    demoTradeable: chapelDesk,
    chapelDesk,
    chapelRouted,
    chapelRouteLabel: chapelRouted ? `Chapel route · ${proxy}` : undefined,
    gateEvalOnly,
    suggestedNetwork: chapelDesk ? "bsc-testnet" : mirrorTestnetForSource(token.chainId),
    settlement: chapelDesk ? "BSC Testnet · PancakeSwap V2 · wallet-signed" : undefined,
  };
}

export function chapelDeskLabel(token: {
  chapelDesk?: boolean;
  chapelRouted?: boolean;
  chapelRouteLabel?: string;
  gateEvalOnly?: boolean;
  demoTradeable?: boolean;
}) {
  if (token.chapelRouteLabel) return token.chapelRouteLabel;
  if (token.chapelDesk || token.demoTradeable) return "Chapel desk";
  if (token.gateEvalOnly) return "CMC gate · eval only";
  return null;
}
