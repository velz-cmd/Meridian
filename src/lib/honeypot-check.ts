/**
 * honeypot.is free check (EVM) — complements GoPlus + local heuristics.
 */

export type HoneypotCheckResult = {
  ok: boolean;
  isHoneypot: boolean;
  buyTax?: number;
  sellTax?: number;
  flags: string[];
};

const HONEYPOT_CHAIN: Record<string, number> = {
  ethereum: 1,
  eth: 1,
  bsc: 56,
  binance: 56,
  "bsc-testnet": 97,
  base: 8453,
  arbitrum: 42161,
  optimism: 10,
  polygon: 137,
};

export async function fetchHoneypotIsCheck(
  chainId: string,
  tokenAddress: string,
): Promise<HoneypotCheckResult> {
  const chainID = HONEYPOT_CHAIN[chainId.toLowerCase()];
  if (!chainID) return { ok: false, isHoneypot: false, flags: [] };

  const params = new URLSearchParams({
    address: tokenAddress,
    chainID: String(chainID),
  });

  try {
    const res = await fetch(`https://api.honeypot.is/v2/IsHoneypot?${params}`, {
      next: { revalidate: 180 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, isHoneypot: false, flags: [`honeypot.is ${res.status}`] };

    const json = (await res.json()) as {
      honeypotResult?: { isHoneypot?: boolean };
      simulationSuccess?: boolean;
      buyTax?: number;
      sellTax?: number;
    };

    const isHoneypot = json.honeypotResult?.isHoneypot === true;
    const flags: string[] = [];
    if (isHoneypot) flags.push("honeypot.is: honeypot");
    if (json.simulationSuccess === false) flags.push("honeypot.is: sell simulation failed");
    const buyTax = json.buyTax;
    const sellTax = json.sellTax;
    if ((buyTax ?? 0) > 8 || (sellTax ?? 0) > 8) {
      flags.push(`honeypot.is: tax ${buyTax ?? 0}% / ${sellTax ?? 0}%`);
    }

    return {
      ok: true,
      isHoneypot,
      buyTax,
      sellTax,
      flags,
    };
  } catch {
    return { ok: false, isHoneypot: false, flags: ["honeypot.is timeout"] };
  }
}
