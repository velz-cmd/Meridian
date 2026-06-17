"use client";

import { useState } from "react";
import { useConnect, useAccount, useBalance, useChainId, useDisconnect, useSwitchChain } from "wagmi";
import { Wallet, AlertTriangle, LogOut, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  WalletConnectConsent,
  hasWalletConnectConsent,
  setWalletConnectConsent,
} from "@/components/security/wallet-connect-consent";
import { truncateHash } from "@/lib/utils";
import { BSC_CHAIN_ID } from "@/lib/bsc-chain";
import { DEMO_TRADE_NETWORKS } from "@/lib/testnet-chains";

export function WalletConnectButton({ compact = false }: { compact?: boolean }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { data: balance } = useBalance({ address, chainId: BSC_CHAIN_ID });
  const [consentOpen, setConsentOpen] = useState(false);

  const onBsc = chainId === BSC_CHAIN_ID;

  function doConnect() {
    const connector = connectors[0];
    if (connector) connect({ connector, chainId: BSC_CHAIN_ID });
  }

  async function connectWallet() {
    if (!hasWalletConnectConsent()) {
      setConsentOpen(true);
      return;
    }
    doConnect();
  }

  async function switchToBsc() {
    const chain = DEMO_TRADE_NETWORKS[0];
    try {
      await switchChainAsync({ chainId: chain.chainId });
    } catch {
      const eth = (window as Window & { ethereum?: { request: (args: unknown) => Promise<unknown> } })
        .ethereum;
      await eth?.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${chain.chainId.toString(16)}`,
            chainName: chain.chain.name,
            nativeCurrency: chain.chain.nativeCurrency,
            rpcUrls: chain.chain.rpcUrls.default.http,
            blockExplorerUrls: chain.chain.blockExplorers
              ? [chain.chain.blockExplorers.default.url]
              : [],
          },
        ],
      });
      await switchChainAsync({ chainId: chain.chainId });
    }
  }

  if (isConnected && address) {
    const balanceLabel = balance ? `${Number(balance.formatted).toFixed(4)} BNB` : null;

    return (
      <div className="flex flex-wrap items-center gap-2">
        {!onBsc && (
          <Button
            variant="outline"
            size="sm"
            onClick={switchToBsc}
            className="min-h-[44px] border-amber-400/40 text-amber-200"
          >
            <AlertTriangle className="h-4 w-4" />
            Switch BSC
          </Button>
        )}
        <div className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2">
          <Wallet className="h-4 w-4 shrink-0 text-amber-200" />
          <span className="text-sm font-semibold text-white">{truncateHash(address, 6, 4)}</span>
          {balanceLabel && (
            <span className="rounded-md bg-black/30 px-2 py-0.5 text-xs font-bold text-amber-100">
              {balanceLabel}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className="min-h-[44px] gap-2 border-rose-400/35 text-rose-100 hover:bg-rose-500/15"
          onClick={() => disconnect()}
        >
          <LogOut className="h-4 w-4" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <>
      <WalletConnectConsent
        open={consentOpen}
        onCancel={() => setConsentOpen(false)}
        onConfirm={() => {
          setWalletConnectConsent();
          setConsentOpen(false);
          doConnect();
        }}
      />
      <Button
        variant="nexus"
        size={compact ? "sm" : "default"}
        className="min-h-[44px] gap-2"
        onClick={connectWallet}
        disabled={isPending}
      >
        <Plug className="h-4 w-4" />
        Connect Wallet
      </Button>
    </>
  );
}
