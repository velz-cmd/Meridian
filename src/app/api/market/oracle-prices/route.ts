import { NextResponse } from "next/server";
import { fetchBoracleGatePrices, oracleCmcDeltaPct } from "@/lib/boracle-price";
import { GATE_SYMBOLS, isGateSymbol } from "@/lib/gate-constants";

export const dynamic = "force-dynamic";

/** On-chain boracle USD feeds for gate benchmarks on BSC Testnet (Chapel). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const single = searchParams.get("symbol")?.toUpperCase();

  try {
    const all = await fetchBoracleGatePrices();

    if (single) {
      if (!isGateSymbol(single)) {
        return NextResponse.json({ error: `Oracle feeds cover ${GATE_SYMBOLS.join(", ")} only` }, { status: 400 });
      }
      const row = all[single];
      if (!row) {
        return NextResponse.json({ error: "Oracle read failed" }, { status: 503 });
      }
      return NextResponse.json(
        { ...row, note: row.stale ? "Testnet oracle stale — use CMC for strategy sizing" : undefined },
        { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } },
      );
    }

    return NextResponse.json(
      {
        chain: "BSC Testnet (97)",
        registrySpaceId: "fr.boracle.bnb",
        updateCadence: "~24h on testnet (verify updatedAt on-chain)",
        feeds: all,
      },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Oracle fetch failed" }, { status: 503 });
  }
}
