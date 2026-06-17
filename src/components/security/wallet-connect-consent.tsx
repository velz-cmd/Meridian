"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isOfficialMeridianHost } from "@/lib/site-security";

const CONSENT_KEY = "meridian-wallet-consent-v1";

export function hasWalletConnectConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setWalletConnectConsent(): void {
  try {
    sessionStorage.setItem(CONSENT_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function WalletConnectConsent({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [hostOk, setHostOk] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHostOk(isOfficialMeridianHost(window.location.hostname));
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-labelledby="wallet-consent-title"
    >
      <div className="arc-glass-card max-h-[90vh] w-full max-w-md overflow-y-auto p-5">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-300" />
          <h2 id="wallet-consent-title" className="text-base font-bold text-white">
            Connect wallet safely
          </h2>
        </div>

        {!hostOk && (
          <p className="mb-3 rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            This URL does not match our official app. Use{" "}
            <strong>https://trader-arc.vercel.app</strong> only.
          </p>
        )}

        <ul className="space-y-2 text-xs leading-relaxed text-white/75">
          <li>MERIDIAN never asks for your seed phrase or private key.</li>
          <li>You sign transactions only inside MetaMask / your wallet extension.</li>
          <li>BNB Smart Chain — connect Trust Wallet or MetaMask; review each approval carefully.</li>
          <li>Review each approval: network, amount, and contract address.</li>
        </ul>

        <p className="mt-3 text-[10px] text-white/45">
          Official: trader-arc.vercel.app · We cannot recover funds if you approve a malicious site.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="nexus" className="flex-1" onClick={onConfirm} disabled={!hostOk}>
            I understand — connect
          </Button>
        </div>
      </div>
    </div>
  );
}
