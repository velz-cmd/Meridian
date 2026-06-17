"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { BSC_CHAIN_ID, BSC_CHAIN_LABEL, bsc } from "@/lib/bsc-chain";
import { DEMO_TRADE_NETWORKS } from "@/lib/testnet-chains";

const FAUCET = "https://testnet.bnbchain.org/faucet-smart";

async function addBscTestnetToWallet() {
  const eth = (window as Window & { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
  if (!eth) return;
  await eth.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: `0x${BSC_CHAIN_ID.toString(16)}`,
        chainName: bsc.name,
        nativeCurrency: bsc.nativeCurrency,
        rpcUrls: bsc.rpcUrls.default.http,
        blockExplorerUrls: [bsc.blockExplorers.default.url],
      },
    ],
  });
}

/** Global strip — wrong network or zero tBNB on BSC Testnet */
export function BscTestnetStrip() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { data: tbnbBalance } = useBalance({ address, chainId: BSC_CHAIN_ID });

  if (!isConnected) return null;

  const onTestnet = chainId === BSC_CHAIN_ID;
  const tbnb = tbnbBalance ? Number(tbnbBalance.formatted) : 0;

  async function switchToTestnet() {
    const chain = DEMO_TRADE_NETWORKS[0];
    try {
      await switchChainAsync({ chainId: chain.chainId });
    } catch {
      await addBscTestnetToWallet();
      await switchChainAsync({ chainId: chain.chainId });
    }
  }

  if (!onTestnet) {
    return (
      <div className="border-b border-amber-400/40 bg-amber-500/15 px-4 py-2.5 text-center text-sm text-amber-100">
        <AlertTriangle className="mr-1.5 inline h-4 w-4 align-text-bottom" />
        Wallet is on <strong className="text-white">BNB Mainnet</strong> — MERIDIAN trades only on{" "}
        <strong className="text-white">{BSC_CHAIN_LABEL}</strong> (chain {BSC_CHAIN_ID}).{" "}
        <button
          type="button"
          onClick={() => void switchToTestnet()}
          className="ml-1 font-bold text-amber-50 underline underline-offset-2 hover:text-white"
        >
          Switch network now
        </button>
      </div>
    );
  }

  if (tbnb < 0.001) {
    return (
      <div className="border-b border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-center text-xs text-cyan-100 sm:text-sm">
        {BSC_CHAIN_LABEL} connected · balance <strong className="text-white">{tbnb.toFixed(4)} tBNB</strong> — get
        free testnet BNB from the{" "}
        <a
          href={FAUCET}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 font-bold text-cyan-50 underline underline-offset-2 hover:text-white"
        >
          BSC faucet <ExternalLink className="h-3 w-3" />
        </a>{" "}
        (mainnet BNB does not work here)
      </div>
    );
  }

  return null;
}
