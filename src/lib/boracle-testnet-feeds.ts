import type { GateSymbol } from "@/lib/gate-constants";

/** BNB Chain Testnet boracle feed adapters (AggregatorV2V3Interface). Docs: boracle BSC testnet feeds. */
export type BoracleFeedMeta = {
  pair: string;
  adapter: `0x${string}`;
  spaceId: string;
  asset: `0x${string}`;
};

/** Gate benchmarks with boracle USD feeds on Chapel testnet */
export const BORACLE_TESTNET_FEEDS: Record<GateSymbol, BoracleFeedMeta> = {
  BNB: {
    pair: "BNB/USD",
    adapter: "0x1A26d803C2e796601794f8C5609549643832702C",
    spaceId: "bnb-usd.boracle.bnb",
    asset: "0xD26547AD6a46a6274E6ba39129d08504Dd546AD3",
  },
  CAKE: {
    pair: "CAKE/USD",
    adapter: "0x2A7f7E8E56823a95A3045a29eC9BFf5C14371AFf",
    spaceId: "cake-usd.boracle.bnb",
    asset: "0x713d8754191769ac15E74f1E380Dcc369604F875",
  },
  FLOKI: {
    pair: "FLOKI/USD",
    adapter: "0x04B53E0145360c958946Ae48FdbD631D7DFcf94D",
    spaceId: "floki-usd.boracle.bnb",
    asset: "0x68c80eA99E74FC512962f50b3F98Cd6951c591E5",
  },
  XVS: {
    pair: "XVS/USD",
    adapter: "0x023Ec105fa5cd9A394b2158e7e0f5C10A188971f",
    spaceId: "xvs-usd.boracle.bnb",
    asset: "0x7932dC3a5580BD886107BBfD399d07c6D6846aDf",
  },
};

/** Feed registry Space ID — resolve latest registry via Space ID in production integrations */
export const BORACLE_FEED_REGISTRY_SPACE_ID = "fr.boracle.bnb";

export const BORACLE_USD_ASSET = "0xE29F914Af45489cAfED9B65672b3A0165Fa93073" as const;

export function isBoracleGateSymbol(symbol: string): symbol is GateSymbol {
  return symbol.toUpperCase() in BORACLE_TESTNET_FEEDS;
}
