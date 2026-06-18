/** Convert tBNB spend to USD notional and token amount at live prices. */
export function buySizingFromTbnb(input: {
  tbnbAmount: number;
  bnbSpotUsd: number;
  tokenPriceUsd: number;
}) {
  const tbnb = Math.max(0, input.tbnbAmount);
  const bnbPx = Math.max(input.bnbSpotUsd, 1);
  const tokenPx = Math.max(input.tokenPriceUsd, 0.00000001);
  const usdNotional = tbnb * bnbPx;
  const tokenAmount = usdNotional / tokenPx;
  return { tbnb, usdNotional, tokenAmount, bnbSpotUsd: bnbPx, tokenPriceUsd: tokenPx };
}

export function formatTokenAmount(n: number): string {
  if (n >= 1_000_000) return n.toFixed(0);
  if (n >= 1000) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  return n.toExponential(3);
}
