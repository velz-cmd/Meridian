import { getArcCounterAddress } from "@/lib/arc-counter-contract";
import { ARC_NODE_VERSION, arcExplorerAddress } from "@/lib/arc-chain";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ExternalLink } from "lucide-react";

/** Home hero — BNB Hack Track 2 identity. Arc Testnet kept as a secondary deployment. */
export function ArcDeployedBadge() {
  const counter = getArcCounterAddress();

  return (
    <div className="mt-5 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="nexus"
          className="gap-1.5 border-cyan-400/35 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-100"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          BNB Hack Track 2 · CoinMarketCap
        </Badge>
        <Badge
          variant="nexus"
          className="gap-1.5 border-amber-400/35 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-100"
        >
          BNB Chain · BSC Testnet
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/40">
        <span>Also deployed on Arc Testnet ({ARC_NODE_VERSION})</span>
        {counter ? (
          <a
            href={arcExplorerAddress(counter)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
          >
            Counter contract
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
