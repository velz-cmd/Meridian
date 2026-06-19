"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { trackMeridianEvent } from "@/lib/product-analytics-client";

/** Tracks wallet connect/disconnect — powers /analytics wallet stats. */
export function MeridianWalletBeacon() {
  const { address, isConnected } = useAccount();
  const pathname = usePathname();
  const prevWallet = useRef<string | null>(null);

  useEffect(() => {
    const path = pathname ?? "/";

    if (isConnected && address) {
      const key = address.toLowerCase();
      if (prevWallet.current !== key) {
        prevWallet.current = key;
        trackMeridianEvent({
          kind: "nexus_wallet_connect",
          path,
          meta: { wallet: key },
        });
      }
      return;
    }

    if (prevWallet.current) {
      trackMeridianEvent({
        kind: "nexus_wallet_disconnect",
        path,
        meta: { wallet: prevWallet.current },
      });
      prevWallet.current = null;
    }
  }, [isConnected, address, pathname]);

  return null;
}
