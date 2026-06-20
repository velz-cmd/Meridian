import { BSC_EXPLORER } from "@/lib/bsc-chain";
import { MERIDIAN_FOOTER_LINE, MERIDIAN_NAME } from "@/lib/meridian-brand";

export function MeridianFooter({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-[10px] uppercase tracking-[0.14em] text-white/35 ${className}`}>
      {MERIDIAN_NAME} · {MERIDIAN_FOOTER_LINE}
      <span className="mx-1 text-white/25">·</span>
      <a
        href="/analytics"
        className="font-mono normal-case text-white/30 underline-offset-2 hover:text-cyan-200/70 hover:underline"
      >
        Analytics
      </a>
      <span className="mx-1 text-white/25">·</span>
      <a
        href={BSC_EXPLORER}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono normal-case text-white/30 underline-offset-2 hover:text-amber-200/70 hover:underline"
      >
        BscScan Testnet
      </a>
    </p>
  );
}
