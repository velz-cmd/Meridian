/**
 * BSC Capital Router — relative conviction allocation between BNB & CAKE.
 * Not a screener: answers "where should an agent deploy marginal capital right now?"
 */

/** @typedef {{ symbol: string; gate: object; permit: object; market: object; conviction: number; skills?: object }} RoutedAsset */

/**
 * Per-symbol conviction — spreads scores using gate confidence, skill alignment,
 * momentum/sentiment/regime deltas, and failed checks (no flat 100s for every A+).
 * @param {object} gate
 * @param {object} permit
 * @param {object} [skills]
 */
export function convictionScore(gate, permit, skills = null) {
  const checkRatio = gate.checksPassed / Math.max(gate.checksTotal, 1);
  const gateConf = gate.confidence ?? 50;
  const alignment = skills?.composite?.alignmentScore ?? gateConf;
  const edge = gate.edge ?? 0;
  const gaps = gate.gaps?.length ?? 0;

  let score = gateConf * 0.38 + alignment * 0.22 + checkRatio * 26 + edge * 0.52;

  if (skills?.momentum) {
    const m = skills.momentum;
    score += (m.checksPassed / Math.max(m.checksTotal, 1)) * 5;
    if (m.metrics?.macd === "bullish") score += 5;
    else if (m.metrics?.macd === "bearish") score -= 7;
    if (m.signal === "EXIT") score -= 22;
    else if (m.signal === "ENTER_LONG") score += 6;
  }

  if (skills?.sentiment) {
    const s = skills.sentiment;
    if (s.state === "BULLISH_DIVERGE") score += 9;
    else if (s.state === "BEARISH_DIVERGE") score -= 20;
    else if (s.state === "HEAT_WITHOUT_FLOW") score -= 24;
    else if (s.flagged) score -= 6;
    score += ((s.flowScore ?? 0) - (s.socialHeat ?? 0)) * 0.05;
  }

  if (skills?.regime) {
    if (skills.regime.signal === "AVOID") score -= 16;
    else if (skills.regime.signal === "HOLD") score -= 8;
    else if (skills.regime.signal === "ENTER_LONG") score += 4;
  }

  score -= gaps * 8;

  if (skills?.composite?.blockers?.length) {
    score -= skills.composite.blockers.length * 11;
  }

  if (skills?.relativeStrength) {
    const rs = skills.relativeStrength;
    if (rs.role === "leader") score += 10;
    else if (rs.role === "outperform") score += 5;
    else if (rs.role === "laggard") score -= 18;
    else if (rs.role === "fade") score -= 12;
    score += ((rs.rotationScore ?? 50) - 50) * 0.12;
  }

  if (skills?.volatility) {
    const v = skills.volatility;
    if (v.squeeze) score += 6;
    if (v.expansion) score -= 8;
    if (v.signal === "AVOID") score -= 14;
  }

  const cleared = permit?.status === "GRANT" || gate.signal === "ENTER_LONG";
  if (!cleared || gate.signal === "HOLD" || gate.signal === "AVOID" || gate.signal === "EXIT") {
    score *= gate.signal === "HOLD" ? 0.52 : 0.32;
  }

  return Math.round(Math.min(96, Math.max(6, score)));
}

/** @param {RoutedAsset} asset */
function rankRationale(asset) {
  const { symbol, gate, skills } = asset;
  const parts = [];
  parts.push(`${gate.checksPassed}/${gate.checksTotal} checks`);
  if (gate.edge != null) parts.push(`edge +${gate.edge}`);
  if (gate.gaps?.length) parts.push(`gap: ${gate.gaps[0]}`);
  if (skills?.momentum?.metrics?.rsi != null) {
    parts.push(`RSI ${skills.momentum.metrics.rsi.toFixed(1)}`);
  }
  if (skills?.sentiment?.state && skills.sentiment.state !== "ALIGNED") {
    parts.push(skills.sentiment.state.replace(/_/g, " ").toLowerCase());
  }
  if (skills?.regime?.signal && skills.regime.signal !== "ENTER_LONG") {
    parts.push(`regime ${skills.regime.signal.replace("_", " ").toLowerCase()}`);
  }
  if (skills?.relativeStrength?.role && skills.relativeStrength.role !== "inline") {
    parts.push(`RS ${skills.relativeStrength.role}`);
  }
  if (skills?.volatility?.state && skills.volatility.state !== "unknown" && skills.volatility.state !== "neutral") {
    parts.push(`vol ${skills.volatility.state}`);
  }
  return `${symbol}: ${parts.join(" · ")}`;
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
    splitPrimary = 100;
    if (secondGrant && second.conviction >= 52 && spread < 10) {
      secondary = second.symbol;
      splitPrimary = 65;
      splitSecondary = 35;
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
      : `No deployable conviction on BSC benchmarks (${sorted.map((a) => a.symbol).join(", ")}). Capital stays flat.`;
  } else if (secondary) {
    directive = `${primary} (${top.conviction}) vs ${secondary} (${second.conviction}) — spread only ${spread} pts under ${regime}, so split ${splitPrimary}/${splitSecondary}. ${rankRationale(top)}. Runner-up: ${rankRationale(second)}.`;
  } else {
    directive = `${primary} leads at ${top.conviction} conviction (+${spread} vs #2) under ${regime} — ${rankRationale(top)}.`;
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
      alignmentScore: a.skills?.composite?.alignmentScore ?? a.gate.confidence ?? null,
      gaps: a.gate.gaps ?? [],
      rationale: rankRationale(a),
      price: a.market.price,
      change24h: a.market.change24h,
    })),
    generatedAt: new Date().toISOString(),
  };
}
