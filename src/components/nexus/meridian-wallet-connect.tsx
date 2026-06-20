"use client";

import { useRef, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { AlertTriangle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  WalletConnectConsent,
  hasWalletConnectConsent,
  setWalletConnectConsent,
} from "@/components/security/wallet-connect-consent";
import { BSC_CHAIN_ID, BSC_CHAIN_LABEL } from "@/lib/bsc-chain";
import { DEMO_TRADE_NETWORKS } from "@/lib/testnet-chains";
import { cn } from "@/lib/utils";

function isMobileUa() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** Trust Wallet + MetaMask connect via RainbowKit · BSC Testnet only */
export function MeridianWalletConnect({
  compact = false,
  className,
  label = "Connect wallet",
}: {
  compact?: boolean;
  className?: string;
  label?: string;
}) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { data: balance } = useBalance({ chainId: BSC_CHAIN_ID });
  const [consentOpen, setConsentOpen] = useState(false);
  const openModalRef = useRef<(() => void) | null>(null);
  const onBsc = chainId === BSC_CHAIN_ID;
  const mobile = isMobileUa();

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

  if (isConnected && !onBsc) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={switchToBsc}
        className={cn("min-h-[44px] border-amber-400/40 text-amber-200", className)}
      >
        <AlertTriangle className="h-4 w-4" />
        Switch to {BSC_CHAIN_LABEL}
      </Button>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {mobile && !isConnected && (
        <p className="flex items-center gap-1.5 text-[10px] text-violet-200/85">
          <Smartphone className="h-3 w-3" />
          Mobile: choose Trust Wallet in the modal for QR / deep link · Chapel testnet swaps only
        </p>
      )}
      <WalletConnectConsent
        open={consentOpen}
        onCancel={() => setConsentOpen(false)}
        onConfirm={() => {
          setWalletConnectConsent();
          setConsentOpen(false);
          openModalRef.current?.();
        }}
      />
      <ConnectButton.Custom>
        {({ openConnectModal, mounted, account, chain }) => {
          openModalRef.current = openConnectModal;
          const ready = mounted;
          if (!ready) return null;

          if (account && chain) {
            const bal =
              balance && chain.id === BSC_CHAIN_ID
                ? `${Number(balance.formatted).toFixed(4)} tBNB`
                : null;
            return (
              <ConnectButton
                accountStatus={compact ? "avatar" : "address"}
                chainStatus={compact ? "icon" : "full"}
                showBalance={bal != null}
              />
            );
          }

          return (
            <Button
              variant="nexus"
              size={compact ? "sm" : "default"}
              className="min-h-[44px] gap-2"
              onClick={() => {
                if (!hasWalletConnectConsent()) {
                  setConsentOpen(true);
                  return;
                }
                openConnectModal();
              }}
            >
              {label}
            </Button>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}
