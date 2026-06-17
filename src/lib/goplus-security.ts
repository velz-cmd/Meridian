/**
 * GoPlus token security API (free, no key for public endpoints).
 * https://docs.gopluslabs.io/
 */

export type GoPlusSecurityResult = {
  ok: boolean;
  isHoneypot?: boolean;
  isMintable?: boolean;
  isFreezable?: boolean;
  buyTax?: number;
  sellTax?: number;
  holderCount?: number;
  top10HolderPercent?: number;
  flags: string[];
};

const CHAIN_NUM: Record<string, string> = {
  ethereum: "1",
  eth: "1",
  bsc: "56",
  binance: "56",
  "bsc-testnet": "97",
  base: "8453",
  arbitrum: "42161",
  arb: "42161",
  optimism: "10",
  op: "10",
  polygon: "137",
  matic: "137",
  avalanche: "43114",
  avax: "43114",
};

function goplusChainId(chainId: string): string | null {
  const c = chainId.toLowerCase().trim();
  if (CHAIN_NUM[c]) return CHAIN_NUM[c];
  if (/^\d+$/.test(c)) return c;
  return null;
}

export async function fetchGoPlusTokenSecurity(
  chainId: string,
  tokenAddress: string,
): Promise<GoPlusSecurityResult> {
  const chainNum = goplusChainId(chainId);
  if (!chainNum) return { ok: false, flags: [] };

  const addr = tokenAddress.toLowerCase();
  const url = `https://api.gopluslabs.io/api/v1/token_security/${chainNum}?contract_addresses=${addr}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, flags: [`GoPlus HTTP ${res.status}`] };

    const json = (await res.json()) as {
      code?: number;
      result?: Record<
        string,
        {
          is_honeypot?: string;
          is_mintable?: string;
          is_blacklisted?: string;
          cannot_sell_all?: string;
          holder_count?: string;
          holders?: Array<{ percent?: string }>;
          buy_tax?: string;
          sell_tax?: string;
          is_open_source?: string;
        }
      >;
    };

    const row = json.result?.[addr] ?? json.result?.[tokenAddress];
    if (!row) return { ok: false, flags: ["GoPlus: no data"] };

    const flags: string[] = [];
    const isHoneypot = row.is_honeypot === "1";
    const isMintable = row.is_mintable === "1";
    const cannotSell = row.cannot_sell_all === "1";
    const buyTax = Number(row.buy_tax ?? 0);
    const sellTax = Number(row.sell_tax ?? 0);

    if (isHoneypot) flags.push("GoPlus: honeypot");
    if (cannotSell) flags.push("GoPlus: cannot sell all");
    if (isMintable) flags.push("GoPlus: mintable");
    if (buyTax > 5 || sellTax > 5) flags.push(`GoPlus: tax buy ${buyTax}% / sell ${sellTax}%`);

    let top10 = 0;
    if (Array.isArray(row.holders)) {
      top10 = row.holders.slice(0, 10).reduce((s, h) => s + Number(h.percent ?? 0), 0);
      if (top10 > 100) top10 = top10 / 100;
      if (top10 > 55) flags.push(`GoPlus: top 10 hold ~${top10.toFixed(0)}%`);
    }

    const holderCount = Number(row.holder_count ?? 0) || undefined;

    return {
      ok: true,
      isHoneypot,
      isMintable,
      isFreezable: row.is_blacklisted === "1",
      buyTax,
      sellTax,
      holderCount: holderCount && holderCount > 0 ? holderCount : undefined,
      top10HolderPercent: top10 > 0 ? top10 : undefined,
      flags,
    };
  } catch {
    return { ok: false, flags: ["GoPlus timeout"] };
  }
}
