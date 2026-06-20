/** Shared Gate price / percent formatting — avoids $0.0000 for micro-cap symbols. */

export function formatGatePrice(price: number): string {
  if (price <= 0) return "—";
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(3);
  if (price >= 0.01) return price.toFixed(4);
  if (price >= 0.0001) return price.toFixed(6);
  return price.toFixed(8);
}

export function formatSignedPct(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}
