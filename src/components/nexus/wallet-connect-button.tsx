"use client";

import { MeridianWalletConnect } from "@/components/nexus/meridian-wallet-connect";

/** Navbar wallet entry — RainbowKit multi-wallet (Trust Wallet + MetaMask) */
export function WalletConnectButton({ compact = false }: { compact?: boolean }) {
  return <MeridianWalletConnect compact={compact} />;
}
