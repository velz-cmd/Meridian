import { NextRequest, NextResponse } from "next/server";
import { evaluateAllGateBenchmarks } from "@/lib/gate-benchmark-cache";
import { extractJudgeConsensus } from "@/lib/gate-consensus-payload";
import { GATE_SKILL_REPO, GATE_SYMBOLS, isGateSymbol } from "@/lib/gate-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://trader-arc.vercel.app";

/**
 * Judge-facing CMC skills API — same engine as /gate desk (meridian-skills.mjs + nexus-gate.mjs).
 * GET /api/gate/skills?symbol=BNB
 */
export async function GET(req: NextRequest) {
  const sym = req.nextUrl.searchParams.get("symbol")?.replace(/^\$/, "").trim().toUpperCase() ?? "BNB";
  if (!isGateSymbol(sym)) {
    return NextResponse.json(
      { error: `symbol must be one of ${GATE_SYMBOLS.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const batch = await evaluateAllGateBenchmarks();
    const ev = batch.bySym.get(sym);
    if (!ev) {
      return NextResponse.json({ error: "No CMC evaluation for symbol" }, { status: 404 });
    }

    const consensus = extractJudgeConsensus(ev.skills);

    return NextResponse.json(
      {
        ok: true,
        schema: "nexus-momentum-gate/v1",
        symbol: sym,
        cmcLive: ev.cmcLive,
        fromCache: batch.fromCache,
        degraded: batch.degraded,
        fieldSources: ev.sources,
        market: {
          price: ev.snapshot.price,
          marketCap: ev.snapshot.marketCap,
          volume24h: ev.snapshot.volume24h,
          change1h: ev.snapshot.change1h,
          change24h: ev.snapshot.change24h,
          change7d: ev.snapshot.change7d,
          rsi: ev.snapshot.rsi,
          macdSignal: ev.snapshot.macdSignal,
          fearGreed: ev.snapshot.fearGreed,
        },
        gate: ev.gate,
        skills: ev.skills,
        consensus,
        engine: {
          gate: "bnb-hack/engine/nexus-gate.mjs",
          skills: "bnb-hack/engine/meridian-skills.mjs",
          consensus: "bnb-hack/engine/meridian-skills.mjs → buildJudgeConsensusBlock",
          skillLayers: [
            "momentum",
            "sentiment-divergence",
            "regime-detection",
            "trend-alignment",
            "liquidity-depth",
            "structural-quality",
            "relative-strength-benchmark",
            "volatility-compression",
          ],
          skillDoc: `${GATE_SKILL_REPO}/SKILL.md`,
          backtest: "/api/gate/backtest?symbol=" + sym + "&days=90",
          reproduce: `npm run bnb:backtest -- --symbol ${sym} --days 90`,
        },
        reproduce: {
          skills: `${PUBLIC_ORIGIN}/api/gate/skills?symbol=${sym}`,
          evaluate: `${PUBLIC_ORIGIN}/api/gate/evaluate?symbol=${sym}`,
          route: `${PUBLIC_ORIGIN}/api/gate/route`,
          backtest: `${PUBLIC_ORIGIN}/api/gate/backtest?symbol=${sym}&days=90`,
        },
        generatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Skills evaluation failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
