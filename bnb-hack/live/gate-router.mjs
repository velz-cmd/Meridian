/**
 * BSC Capital Router — relative conviction allocation between BNB & CAKE.
 * Not a screener: answers "where should an agent deploy marginal capital right now?"
 */

/** @typedef {{ symbol: string; gate: object; permit: object; market: object; conviction: number }} RoutedAsset */

const TIER_BASE = { "a-plus": 88, a: 72, watch: 48, avoid: 12 };

/**
 * @param {object} gate structured gate output
 * @param {object} permit constitution permit
 */
export function convictionScore(gate, permit) {
  const tier = gate.tier ?? "watch";
  const base = TIER_BASE[tier] ?? 40;
  const edge = gate.edge ?? 0;
  const agreement = (gate.checksPassed / Math.max(gate.checksTotal, 1)) * 22;
  const permitAdj = permit.status === "GRANT" ? 18 : -35;
  const signalAdj =
    gate.signal === "ENTER_LONG" ? 12 : gate.signal === "AVOID" ? -25 : gate.signal === "EXIT" ? -8 : 0;
  const regime = gate.regime ?? "neutral";
  const regimeMult = regime === "risk-off" ? 0.82 : regime === "risk-on" ? 1.06 : 1;

  return Math.round(Math.min(100, Math.max(0, (base + edge * 0.45 + agreement + permitAdj + signalAdj) * regimeMult)));
}

/**
 * @param {RoutedAsset[]} assets
 * @param {{ agentAction?: string; regime?: string; fearGreed?: number }} ctx
 */
export function routeBscCapital(assets, ctx = {}) {
  const sorted = [...assets].sort((a, b) => b.conviction - a.conviction);
  const top = sorted[0];
  const second = sorted[1];
  const regime = ctx.regime ?? top?.gate?.regime ?? "neutral";
  const fg = ctx.fearGreed ?? top?.market?.fearGreed ?? 50;
  const agentWantsBuy = ctx.agentAction === "BUY";

  const topGrant = top?.permit?.status === "GRANT";
  const secondGrant = second?.permit?.status === "GRANT";
  const spread = top && second ? top.conviction - second.conviction : 0;

  /** @type {"BNB" | "CAKE" | "FLAT"} */
  let primary = "FLAT";
  /** @type {"BNB" | "CAKE" | null} */
  let secondary = null;
  let splitPrimary = 0;
  let splitSecondary = 0;

  if (topGrant && top.conviction >= 58) {
    primary = top.symbol;
    splitPrimary = spread >= 15 || !secondGrant ? 100 : 70;
    if (secondGrant && second.conviction >= 52 && spread < 15) {
      secondary = second.symbol;
      splitPrimary = 70;
      splitSecondary = 30;
    }
  } else if (regime === "risk-off" && fg < 35) {
    primary = "FLAT";
  } else if (secondGrant && second.conviction >= 55) {
    primary = second.symbol;
    splitPrimary = 100;
  }

  let directive;
  if (primary === "FLAT") {
    directive = agentWantsBuy
      ? "Agent BUY rejected — no BSC benchmark clears constitution under current regime. Stay flat."
      : "No deployable conviction on BNB or CAKE. Capital stays flat.";
  } else if (secondary) {
    directive = `Route ${splitPrimary}% to ${primary}, ${splitSecondary}% to ${secondary} — relative edge under ${regime} tape.`;
  } else {
    directive = `Deploy to ${primary} (${splitPrimary}%) — highest conviction permit on BSC benchmarks.`;
  }

  return {
    schema: "meridian-bsc-capital-router/v1",
    regime,
    fearGreed: fg,
    agentAction: ctx.agentAction ?? null,
    allocation: {
      primary,
      secondary,
      splitPrimaryPct: splitPrimary,
      splitSecondaryPct: splitSecondary,
    },
    directive,
    ranked: sorted.map((a, i) => ({
      rank: i + 1,
      symbol: a.symbol,
      conviction: a.conviction,
      permit: a.permit.status,
      signal: a.gate.signal,
      tier: a.gate.tier,
      edge: a.gate.edge,
      checks: `${a.gate.checksPassed}/${a.gate.checksTotal}`,
      price: a.market.price,
      change24h: a.market.change24h,
    })),
    generatedAt: new Date().toISOString(),
  };
}
