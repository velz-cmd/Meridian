/**
 * MERIDIAN Strategy Skills — CMC-powered, deterministic, backtest-compatible.
 * Three skills compose the constitution before permit:
 *  1. Momentum — RSI + MACD + Fear & Greed entry/exit
 *  2. Sentiment divergence — price attention vs volume flow (CMC proxies)
 *  3. Regime — macro positioning + strategy mode switch
 *  4. Trend alignment — multi-timeframe CMC quote deltas (1h/24h/7d/30d)
 *  5. Liquidity depth — turnover, volume USD, volume trend
 *  6. Structural quality — cap tier, CMC rank, FDV dilution
 *  7. Relative strength — vs BNB router benchmark (CMC quote deltas)
 *  8. Volatility compression — ATR squeeze / expansion (daily OHLC venue)
 */

/** @typedef {import("./nexus-gate.mjs").CmcTokenSnapshot} CmcTokenSnapshot */

/**
 * @typedef {object} SkillCheck
 * @property {string} id
 * @property {string} label
 * @property {boolean} pass
 */

/**
 * Skill 1 — Momentum: RSI, MACD, Fear & Greed blended entry/exit.
 * @param {CmcTokenSnapshot} t
 */
export function evaluateMomentumSkill(t) {
  const rsi = t.rsi ?? 50;
  const macd = (t.macdSignal ?? "neutral").toLowerCase();
  const fg = t.fearGreed ?? 50;
  const ch1 = t.change1h ?? 0;
  const ch24 = t.change24h ?? 0;

  const checks = [
    { id: "rsi_entry", label: `RSI ${rsi.toFixed(1)} in 35–72`, pass: rsi >= 35 && rsi <= 72 },
    { id: "rsi_exit", label: "RSI not overbought (>78)", pass: rsi <= 78 },
    { id: "macd", label: `MACD ${macd} — not bearish vs tape`, pass: macd !== "bearish" || ch24 < 12 },
    { id: "fg_entry", label: `Fear & Greed ${Math.round(fg)} ≤ 85`, pass: fg <= 85 },
    { id: "fg_not_panic", label: "F&G not extreme fear block (<12)", pass: fg >= 12 || ch24 > -8 },
    {
      id: "momentum",
      label: "1h/24h momentum aligned for long",
      pass: ch24 >= -12 && (ch1 >= -6 || ch24 >= 4),
    },
  ];

  const passed = checks.filter((c) => c.pass).length;
  let signal = "HOLD";
  let action = "FLAT";

  if (rsi > 78 || fg > 88 || (ch24 < -18 && rsi < 42)) {
    signal = "EXIT";
    action = "CLOSE";
  } else if (passed >= 5 && rsi >= 35 && rsi <= 72 && fg <= 85) {
    signal = macd === "bullish" || (ch24 >= 2 && ch1 >= 0) ? "ENTER_LONG" : "HOLD";
    action = signal === "ENTER_LONG" ? "LONG" : "FLAT";
  } else if (rsi < 35 || ch24 < -20) {
    signal = "EXIT";
    action = "CLOSE";
  }

  return {
    id: "momentum",
    name: "Momentum",
    signal,
    action,
    confidence: Math.round(40 + (passed / checks.length) * 45 + (macd === "bullish" ? 8 : 0)),
    metrics: { rsi, macd, fearGreed: fg, change1h: ch1, change24h: ch24 },
    checks,
    checksPassed: passed,
    checksTotal: checks.length,
    entryRule: "RSI 35–72 · MACD not bearish · F&G ≤ 85 · momentum aligned",
    exitRule: "RSI > 78 · F&G > 88 · 24h < −18%",
    dataSource: "coinmarketcap/quotes + fear-and-greed",
  };
}

/**
 * Skill 2 — Sentiment divergence: social heat (price attention) vs flow (volume turnover).
 * CMC-only — no synthetic social APIs on gate path.
 * @param {CmcTokenSnapshot} t
 */
export function evaluateSentimentDivergenceSkill(t) {
  const ch1 = t.change1h ?? 0;
  const ch24 = t.change24h ?? 0;
  const ch7 = t.change7d ?? 0;
  const mc = t.marketCap ?? 0;
  const vol = t.volume24h ?? 0;
  const turnover = mc > 0 ? vol / mc : 0;
  const flow = t.buyFlowRatio ?? null;

  /** Price-attention proxy from CMC quote deltas (labeled honestly). */
  const socialHeat = Math.min(
    100,
    Math.round(Math.abs(ch1) * 4 + Math.abs(ch24) * 1.2 + Math.abs(ch7) * 0.35),
  );

  /** Volume-flow proxy: turnover percentile-style score. */
  const flowScore = Math.min(100, Math.round(turnover * 280 + (flow != null ? flow * 40 : 0)));

  const priceUp = ch24 > 2.5;
  const priceDown = ch24 < -2.5;
  const flowStrong = turnover >= 0.045 || (flow != null && flow >= 0.54);
  const flowWeak = turnover < 0.028 && (flow == null || flow < 0.48);

  let state = "ALIGNED";
  let signal = "HOLD";
  let flag = false;

  if (priceUp && flowWeak) {
    state = "BEARISH_DIVERGE";
    signal = "EXIT";
    flag = true;
  } else if (priceDown && flowStrong) {
    state = "BULLISH_DIVERGE";
    signal = "ENTER_LONG";
    flag = true;
  } else if (socialHeat > 55 && flowScore < 38) {
    state = "HEAT_WITHOUT_FLOW";
    signal = "AVOID";
    flag = true;
  } else if (flowScore > 58 && socialHeat < 32) {
    state = "FLOW_WITHOUT_HEAT";
    signal = "ENTER_LONG";
  } else {
    state = "ALIGNED";
    signal = priceUp && flowStrong ? "ENTER_LONG" : "HOLD";
  }

  return {
    id: "sentiment-divergence",
    name: "Sentiment divergence",
    state,
    signal,
    flagged: flag,
    socialHeat,
    flowScore,
    turnover: Math.round(turnover * 1000) / 1000,
    buyFlowRatio: flow,
    thesis: flag
      ? state === "BEARISH_DIVERGE"
        ? "Price up on weak volume — attention without flow confirmation."
        : state === "HEAT_WITHOUT_FLOW"
          ? "High price heat, low turnover — social narrative ahead of real flow."
          : "Flow/price mismatch detected."
      : state === "BULLISH_DIVERGE"
        ? "Price weak but volume elevated — accumulation under the tape."
        : "Heat and flow agree — no divergence.",
    dataSource: flow != null ? "cmc-quotes + on-chain-flow" : "cmc-quotes-turnover-proxy",
  };
}

/**
 * Skill 3 — Regime detection: macro positioning + strategy mode.
 * Derivatives positioning proxied from CMC global metrics + fear/greed (no fake funding rates).
 * @param {CmcTokenSnapshot} t
 * @param {object} [macro]
 * @param {number} [macro.btcDominance]
 * @param {number} [macro.totalMarketChange24h]
 * @param {number} [macro.altcoinMarketCapChange24h]
 */
export function evaluateRegimeSkill(t, macro = {}) {
  const fg = t.fearGreed ?? 50;
  const ch1 = t.change1h ?? 0;
  const ch24 = t.change24h ?? 0;
  const ch7 = t.change7d ?? 0;
  const btcDom = macro.btcDominance ?? null;
  const mktCh24 = macro.totalMarketChange24h ?? null;
  const altCh24 = macro.altcoinMarketCapChange24h ?? null;

  let regime = "neutral";
  if (fg < 30 || (mktCh24 != null && mktCh24 < -3 && fg < 40)) regime = "risk-off";
  else if (fg > 70 && (mktCh24 == null || mktCh24 > 1)) regime = "risk-on";

  /** Positioning proxy — crowded long unwind vs short cover vs balanced */
  let positioning = "balanced";
  if (regime === "risk-off" && ch7 < -5 && fg < 35) positioning = "crowded-long-unwind";
  else if (regime === "risk-off" && fg < 25) positioning = "capitulation";
  else if (regime === "risk-on" && fg > 75) positioning = "crowded-long";
  else if (regime === "risk-on" && btcDom != null && btcDom < 52 && altCh24 != null && altCh24 > 2) {
    positioning = "alt-risk-on";
  }

  /** Strategy mode switches entry strictness */
  let strategyMode = "standard";
  let signal = "HOLD";
  if (regime === "risk-off") {
    strategyMode = positioning === "crowded-long-unwind" ? "defensive" : "tight";
    if (positioning === "crowded-long-unwind") signal = "AVOID";
    else if (positioning === "capitulation") {
      // Contrarian long only when washout is stabilizing — not when 7d still bleeding
      if (ch7 > 3 && ch24 > -4) signal = "ENTER_LONG";
      else if (ch24 > -3 && ch7 > -8 && ch1 >= -4) signal = "HOLD";
      else signal = "HOLD";
    } else {
      signal = Math.abs(ch24) < 2 ? "HOLD" : ch24 < -5 ? "AVOID" : "HOLD";
    }
  } else if (regime === "risk-on") {
    strategyMode = positioning === "crowded-long" ? "tight" : "aggressive";
    signal = positioning === "crowded-long" ? "HOLD" : "ENTER_LONG";
  }

  return {
    id: "regime",
    name: "Regime",
    regime,
    positioning,
    strategyMode,
    signal,
    metrics: {
      fearGreed: fg,
      btcDominance: btcDom,
      marketChange24h: mktCh24,
      altcoinChange24h: altCh24,
    },
    switchRule:
      regime === "risk-off"
        ? "Tighten entries · favor flat unless capitulation"
        : regime === "risk-on"
          ? "Allow momentum entries · watch crowded-long fade"
          : "Standard constitution bars",
    dataSource: macro.btcDominance != null ? "cmc-global-metrics + fear-and-greed" : "cmc-fear-and-greed + quotes",
  };
}

/**
 * Skill 4 — Multi-timeframe trend alignment (CMC quote deltas: 1h/24h/7d/30d).
 * @param {CmcTokenSnapshot} t
 */
export function evaluateTrendAlignmentSkill(t) {
  const ch1 = t.change1h ?? 0;
  const ch24 = t.change24h ?? 0;
  const ch7 = t.change7d ?? 0;
  const ch30 = t.change30d ?? null;

  const distribution = ch7 > 8 && ch24 < -4 && ch1 < -3;
  const alignedUp = ch24 > 0 && ch7 > 0 && ch1 >= -6;
  const alignedRecover = ch24 > -6 && ch7 > 3 && ch1 >= 0;

  const checks = [
    {
      id: "tf_24_7",
      label: "24h/7d not fighting",
      pass: ch24 * ch7 >= 0 || Math.abs(ch7) < 2.5,
    },
    {
      id: "tf_1h_hold",
      label: "1h not crashing vs positive 24h",
      pass: ch24 <= 0 || ch1 >= -8,
    },
    {
      id: "tf_30d",
      label: ch30 != null ? `30d ${ch30.toFixed(1)}% supports tape` : "30d n/a (CMC quote)",
      pass: ch30 == null || ch30 * ch24 >= -1 || ch24 > 0,
    },
    {
      id: "distribution",
      label: "No 7d-up / 24h-down distribution",
      pass: !distribution,
    },
  ];

  const passed = checks.filter((c) => c.pass).length;
  let signal = "HOLD";
  if (distribution) signal = "EXIT";
  else if (alignedUp || alignedRecover) signal = passed >= 3 ? "ENTER_LONG" : "HOLD";
  else if (ch24 < -12 && ch7 < -8) signal = "AVOID";

  return {
    id: "trend-alignment",
    name: "Trend alignment",
    signal,
    checks,
    checksPassed: passed,
    checksTotal: checks.length,
    metrics: { change1h: ch1, change24h: ch24, change7d: ch7, change30d: ch30 },
    thesis: distribution
      ? "Higher timeframes up but intraday rolling over — distribution risk."
      : alignedUp
        ? "1h/24h/7d aligned bullish on CMC quotes."
        : alignedRecover
          ? "7d strength with 24h stabilizing — recovery alignment."
          : "Mixed timeframe signals — wait for alignment.",
    dataSource: "coinmarketcap/quotes/latest",
  };
}

/**
 * Skill 5 — Liquidity depth: volume, turnover, volume trend (CMC quotes).
 * @param {CmcTokenSnapshot} t
 */
export function evaluateLiquidityDepthSkill(t) {
  const mc = t.marketCap ?? 0;
  const vol = t.volume24h ?? 0;
  const volCh = t.volumeChange24h ?? null;
  const turnover = mc > 0 ? vol / mc : 0;
  const largeCap = mc >= 1_000_000_000;

  const checks = [
    {
      id: "turnover_min",
      label: `Turnover ${turnover.toFixed(3)} ≥ 0.02`,
      pass: turnover >= 0.02 || largeCap,
    },
    {
      id: "turnover_max",
      label: "Turnover ≤ 0.45 (wash guard)",
      pass: turnover <= 0.45,
    },
    {
      id: "vol_usd",
      label: `24h vol $${(vol / 1_000_000).toFixed(2)}M`,
      pass: vol >= 500_000 || mc >= 500_000_000,
    },
    {
      id: "vol_trend",
      label: volCh != null ? `Volume Δ24h ${volCh.toFixed(0)}%` : "Volume trend n/a",
      pass: volCh == null || volCh > -40,
    },
  ];

  const passed = checks.filter((c) => c.pass).length;
  let signal = "HOLD";
  if (!checks[0].pass && !largeCap) signal = "AVOID";
  else if (!checks[1].pass) signal = "AVOID";
  else if (volCh != null && volCh <= -40) signal = "EXIT";
  else if (passed >= 3) signal = "ENTER_LONG";

  return {
    id: "liquidity-depth",
    name: "Liquidity depth",
    signal,
    checks,
    checksPassed: passed,
    checksTotal: checks.length,
    turnover: Math.round(turnover * 1000) / 1000,
    volume24h: vol,
    volumeChange24h: volCh,
    thesis:
      signal === "AVOID"
        ? "Thin or abnormal turnover — size down or skip on Chapel."
        : signal === "EXIT"
          ? "Volume collapsing vs prior day — liquidity stress."
          : passed >= 3
            ? "Volume and turnover support tactical sizing."
            : "Liquidity acceptable but not ideal.",
    dataSource: "coinmarketcap/quotes/latest",
  };
}

/**
 * Skill 6 — Structural quality: cap tier, CMC rank, FDV dilution (CMC quotes).
 * @param {CmcTokenSnapshot} t
 */
export function evaluateStructuralQualitySkill(t) {
  const mc = t.marketCap ?? 0;
  const rank = t.cmcRank ?? null;
  const fdv = t.fdv ?? null;
  const dilution = fdv != null && mc > 0 ? fdv / mc : null;
  const established = mc >= 80_000_000;

  const checks = [
    {
      id: "cap_tier",
      label: established ? "Large-cap benchmark (≥$80M)" : `Cap $${(mc / 1_000_000).toFixed(0)}M`,
      pass: established || mc >= 20_000_000,
    },
    {
      id: "rank",
      label: rank != null ? `CMC rank #${rank}` : "Rank n/a",
      pass: rank == null || rank <= 500,
    },
    {
      id: "dilution",
      label: dilution != null ? `FDV/mcap ${dilution.toFixed(2)}×` : "FDV n/a",
      pass: dilution == null || dilution <= 1.35,
    },
  ];

  const passed = checks.filter((c) => c.pass).length;
  let signal = "HOLD";
  if (!checks[0].pass) signal = "AVOID";
  else if (dilution != null && dilution > 1.35) signal = "AVOID";
  else if (established && passed >= 2) signal = "ENTER_LONG";
  else if (passed >= 2) signal = "HOLD";

  return {
    id: "structural-quality",
    name: "Structural quality",
    signal,
    grade: established ? "benchmark" : passed >= 2 ? "acceptable" : "weak",
    checks,
    checksPassed: passed,
    checksTotal: checks.length,
    metrics: { marketCap: mc, cmcRank: rank, fdvRatio: dilution },
    thesis: established
      ? "Established CMC benchmark — structural risk controlled."
      : passed >= 2
        ? "Acceptable structure for gate evaluation."
        : "Weak cap/rank/dilution profile — eval only or size small.",
    dataSource: "coinmarketcap/quotes/latest",
  };
}

/**
 * Skill 7 — Relative strength vs BNB (BSC router benchmark).
 * Uses same CMC quotes batch — capital rotation, not generic RS indicator.
 * @param {CmcTokenSnapshot} t
 * @param {CmcTokenSnapshot | null} benchmark BNB snapshot from batch
 * @param {object} [macro]
 */
export function evaluateRelativeStrengthSkill(t, benchmark, macro = {}) {
  const sym = (t.symbol ?? "TOKEN").toUpperCase();
  const ch1 = t.change1h ?? 0;
  const ch24 = t.change24h ?? 0;
  const ch7 = t.change7d ?? 0;

  let benchLabel = "BNB";
  let b1 = benchmark?.change1h ?? 0;
  let b24 = benchmark?.change24h ?? 0;
  let b7 = benchmark?.change7d ?? 0;

  if (sym === "BNB" || !benchmark) {
    benchLabel = "alt basket";
    b24 = macro.altcoinMarketCapChange24h ?? macro.totalMarketChange24h ?? 0;
    b7 = 0;
    b1 = 0;
  }

  const rs1 = ch1 - b1;
  const rs24 = ch24 - b24;
  const rs7 = ch7 - b7;
  const rotationScore = Math.round(Math.min(100, Math.max(0, 50 + rs24 * 2.2 + rs7 * 0.8 + rs1 * 0.6)));

  const leader = rs24 >= 2 && rs7 >= -1;
  const laggard = rs24 <= -4 && rs7 <= -2;
  const fadingLeader = rs7 > 4 && rs24 < -2;

  const checks = [
    {
      id: "rs24",
      label: `RS 24h vs ${benchLabel} ${rs24 >= 0 ? "+" : ""}${rs24.toFixed(2)}%`,
      pass: rs24 >= -2.5,
    },
    {
      id: "rs7",
      label: `RS 7d vs ${benchLabel} ${rs7 >= 0 ? "+" : ""}${rs7.toFixed(2)}%`,
      pass: rs7 >= -4 || rs24 > 1.5,
    },
    {
      id: "no_fade",
      label: "Not fading vs benchmark",
      pass: !fadingLeader,
    },
  ];

  const passed = checks.filter((c) => c.pass).length;
  let signal = "HOLD";
  let role = "inline";
  if (laggard) {
    signal = "AVOID";
    role = "laggard";
  } else if (fadingLeader) {
    signal = "EXIT";
    role = "fade";
  } else if (leader && passed >= 2) {
    signal = "ENTER_LONG";
    role = "leader";
  } else if (rs24 > 0 && passed >= 2) {
    signal = "ENTER_LONG";
    role = "outperform";
  }

  return {
    id: "relative-strength",
    name: "Relative strength",
    signal,
    role,
    rotationScore,
    checks,
    checksPassed: passed,
    checksTotal: checks.length,
    metrics: { rs1h: rs1, rs24h: rs24, rs7d: rs7, benchmark: benchLabel },
    thesis: laggard
      ? `Underperforming ${benchLabel} on 24h/7d — deprioritize for BSC capital rotation.`
      : fadingLeader
        ? `Was strong vs ${benchLabel} on 7d but rolling over intraday — rotation fade.`
        : leader
          ? `Leading ${benchLabel} — priority for marginal BSC desk capital.`
          : rs24 >= 0
            ? `Inline vs ${benchLabel} — acceptable for bench allocation.`
            : `Slight lag vs ${benchLabel} — size conservatively.`,
    dataSource: "coinmarketcap/quotes/latest",
  };
}

/**
 * Skill 8 — Volatility compression / expansion (ATR from daily OHLC).
 * @param {CmcTokenSnapshot} t
 * @param {ReturnType<import("./volatility-metrics.mjs").computeVolatilityFromOhlcBars>} vol
 */
export function evaluateVolatilityCompressionSkill(t, vol) {
  if (!vol) {
    return {
      id: "volatility-compression",
      name: "Volatility regime",
      signal: "HOLD",
      state: "unknown",
      checks: [{ id: "data", label: "Daily OHLC unavailable", pass: true }],
      checksPassed: 1,
      checksTotal: 1,
      thesis: "Volatility skill waits for daily bars (Binance venue or CMC historical).",
      dataSource: "pending",
    };
  }

  const ch1 = Math.abs(t.change1h ?? 0);
  const rsi = t.rsi ?? 50;

  const checks = [
    {
      id: "atr_sane",
      label: `ATR ${vol.atrPct}% of price`,
      pass: vol.atrPct <= 11,
    },
    {
      id: "no_whip",
      label: "No expansion whip (ATR spike + 1h shock)",
      pass: !(vol.expansion && ch1 > 7),
    },
    {
      id: "squeeze_ok",
      label: vol.squeeze ? "Coiled squeeze — favorable setup" : "Not in squeeze",
      pass: vol.squeeze || !vol.expansion,
    },
    {
      id: "rsi_expansion",
      label: "Expansion not at overbought RSI",
      pass: !(vol.expansion && rsi > 72),
    },
  ];

  const passed = checks.filter((c) => c.pass).length;
  let signal = "HOLD";
  if (vol.expansion && (ch1 > 7 || rsi > 72)) signal = "AVOID";
  else if (vol.expansion && ch1 > 5) signal = "EXIT";
  else if (vol.squeeze && rsi >= 35 && rsi <= 68) signal = "ENTER_LONG";
  else if (vol.squeeze) signal = "HOLD";

  return {
    id: "volatility-compression",
    name: "Volatility regime",
    signal,
    state: vol.state,
    squeeze: vol.squeeze,
    expansion: vol.expansion,
    checks,
    checksPassed: passed,
    checksTotal: checks.length,
    metrics: {
      atrPct: vol.atrPct,
      compressionRatio: vol.compressionRatio,
      rangePct: vol.rangePct,
      rangePercentile: vol.rangePercentile,
    },
    thesis: vol.squeeze
      ? `ATR coiled (${vol.compressionRatio}×) — compression favors tactical breakout long when gate clears.`
      : vol.expansion
        ? `Volatility expanding (${vol.compressionRatio}×) — reduce size or wait for stabilization.`
        : `Neutral vol regime · ATR ${vol.atrPct}% · range ${vol.rangePct}%.`,
    dataSource: vol.source,
  };
}

/**
 * Published consensus thresholds — judge-facing, backtest-stable.
 * @type {const}
 */
export const CONSENSUS_RULES = {
  schema: "meridian-skill-consensus/v2",
  /** Weighted long share required (constitution included). */
  longWeightMinPct: 55,
  /** Minimum layer count voting ENTER_LONG (of 9). */
  minLongLayerCount: 4,
  /** Minimum of core directional stack voting long. */
  minCoreDirectionalCount: 2,
  coreDirectionalIds: ["momentum", "regime", "trend", "relativeStrength"],
  /** Max weighted bearish share for a cleared long. */
  bearWeightMaxPct: 15,
  /** Layer weights used in desk vote (sum ≈ 11.3). */
  layerWeights: {
    constitution: 2.5,
    momentum: 1.2,
    sentiment: 1,
    regime: 1.5,
    trend: 1.1,
    liquidity: 1,
    structural: 0.6,
    relativeStrength: 1.4,
    volatility: 1,
  },
};

const CORE_IDS = CONSENSUS_RULES.coreDirectionalIds;

/**
 * Weighted consensus — all layers must agree for ENTER_LONG; honest alignment %.
 * @param {object} input
 * @param {ReturnType<typeof import("./nexus-gate.mjs").evaluateNexusGate>} input.gate
 * @param {object} input.skills
 * @param {string[]} input.blockers
 */
function resolveCompositeConsensus({ gate, skills, blockers }) {
  const w = CONSENSUS_RULES.layerWeights;
  const layers = [
    { id: "constitution", name: "Constitution", signal: gate.signal, weight: w.constitution },
    { id: "momentum", name: "Momentum", signal: skills.momentum.signal, weight: w.momentum },
    { id: "sentiment", name: "Sentiment", signal: skills.sentiment.signal, weight: w.sentiment },
    { id: "regime", name: "Regime", signal: skills.regime.signal, weight: w.regime },
    { id: "trend", name: "Trend", signal: skills.trend.signal, weight: w.trend },
    { id: "liquidity", name: "Liquidity", signal: skills.liquidity.signal, weight: w.liquidity },
    { id: "structural", name: "Structural", signal: skills.structural.signal, weight: w.structural },
    { id: "relativeStrength", name: "RS vs BNB", signal: skills.relativeStrength.signal, weight: w.relativeStrength },
    { id: "volatility", name: "Volatility", signal: skills.volatility.signal, weight: w.volatility },
  ];

  const totalWeight = layers.reduce((s, l) => s + l.weight, 0);
  let longW = 0;
  let holdW = 0;
  let bearW = 0;

  for (const layer of layers) {
    if (layer.signal === "ENTER_LONG") longW += layer.weight;
    else if (layer.signal === "HOLD") holdW += layer.weight;
    else bearW += layer.weight;
  }

  const longPct = longW / totalWeight;
  const holdPct = holdW / totalWeight;
  const bearPct = bearW / totalWeight;
  const LONG_MIN = CONSENSUS_RULES.longWeightMinPct / 100;
  const BEAR_MAX = CONSENSUS_RULES.bearWeightMaxPct / 100;
  const constitutionLong = gate.signal === "ENTER_LONG";

  const longVotes = layers.filter((l) => l.signal === "ENTER_LONG").length;
  const holdVotes = layers.filter((l) => l.signal === "HOLD").length;
  const bearVotes = layers.filter((l) => l.signal === "EXIT" || l.signal === "AVOID").length;

  const coreLong = layers.filter((l) => CORE_IDS.includes(l.id) && l.signal === "ENTER_LONG").length;
  const coreStackPass = coreLong >= CONSENSUS_RULES.minCoreDirectionalCount;
  const longLayerPass = longVotes >= CONSENSUS_RULES.minLongLayerCount;

  let compositeSignal = "HOLD";

  if (blockers.length > 0) {
    compositeSignal = bearPct >= 0.28 ? (layers.some((l) => l.signal === "EXIT") ? "EXIT" : "AVOID") : "HOLD";
  } else if (
    constitutionLong &&
    longPct >= LONG_MIN &&
    bearPct < BEAR_MAX &&
    longLayerPass &&
    coreStackPass
  ) {
    compositeSignal = "ENTER_LONG";
  } else if (bearPct >= 0.32 && bearW > longW) {
    compositeSignal = layers.some((l) => l.signal === "EXIT") ? "EXIT" : "AVOID";
  } else {
    compositeSignal = "HOLD";
  }

  let agreeWeight = 0;
  for (const layer of layers) {
    if (layer.signal === compositeSignal) agreeWeight += layer.weight;
    else if (
      compositeSignal === "HOLD" &&
      (layer.signal === "HOLD" || layer.signal === "AVOID" || layer.signal === "EXIT")
    ) {
      agreeWeight += layer.weight * 0.85;
    }
  }

  const alignmentScore = Math.round(Math.min(100, Math.max(0, (agreeWeight / totalWeight) * 100)));
  const cleared =
    blockers.length === 0 &&
    compositeSignal === "ENTER_LONG" &&
    constitutionLong &&
    coreStackPass &&
    longLayerPass;

  let permitReason;
  if (cleared) {
    permitReason = `${longVotes}/${layers.length} layers long · ${Math.round(longPct * 100)}% weight · core stack ${coreLong}/${CONSENSUS_RULES.minCoreDirectionalCount}`;
  } else if (blockers.length > 0) {
    permitReason = `Blocked: ${blockers.join(", ")}`;
  } else if (constitutionLong && !longLayerPass) {
    permitReason = `Constitution clears but only ${longVotes}/${CONSENSUS_RULES.minLongLayerCount} layers long (need ${CONSENSUS_RULES.minLongLayerCount})`;
  } else if (constitutionLong && !coreStackPass) {
    permitReason = `Core directional stack ${coreLong}/${CONSENSUS_RULES.minCoreDirectionalCount} long (momentum/regime/trend/RS)`;
  } else if (constitutionLong && longPct < LONG_MIN) {
    permitReason = `Long weight ${Math.round(longPct * 100)}% < ${CONSENSUS_RULES.longWeightMinPct}% threshold`;
  } else if (constitutionLong && bearPct >= BEAR_MAX) {
    permitReason = `Bear weight ${Math.round(bearPct * 100)}% exceeds ${CONSENSUS_RULES.bearWeightMaxPct}% cap`;
  } else if (!constitutionLong) {
    permitReason = `Constitution ${gate.signal.replace(/_/g, " ")} — desk flat`;
  } else {
    permitReason = "Skill stack not aligned — hold flat";
  }

  return {
    compositeSignal,
    alignmentScore,
    longPct: Math.round(longPct * 100),
    holdPct: Math.round(holdPct * 100),
    bearPct: Math.round(bearPct * 100),
    layers: layers.map((l) => ({
      id: l.id,
      name: l.name,
      signal: l.signal,
      weight: l.weight,
      agreesWithDesk:
        l.signal === compositeSignal ||
        (compositeSignal === "HOLD" && l.signal !== "ENTER_LONG"),
    })),
    votes: { long: longVotes, hold: holdVotes, bear: bearVotes, total: layers.length },
    coreStack: {
      ids: CORE_IDS,
      long: coreLong,
      required: CONSENSUS_RULES.minCoreDirectionalCount,
      passed: coreStackPass,
    },
    longLayerPass,
    rules: CONSENSUS_RULES,
    permit: { status: cleared ? "GRANT" : "DENY", execute: cleared ? "LONG" : "FLAT", reason: permitReason },
    cleared,
  };
}

/**
 * Judge-facing consensus audit — same object returned in /api/gate/skills.
 * @param {string} symbol
 * @param {ReturnType<typeof import("./nexus-gate.mjs").evaluateNexusGate>} gate
 * @param {ReturnType<typeof resolveCompositeConsensus>} consensus
 * @param {string[]} blockers
 */
export function buildJudgeConsensusBlock(symbol, gate, consensus, blockers) {
  const sym = symbol.toUpperCase();
  const constitutionOnly =
    gate.signal === "ENTER_LONG" && consensus.compositeSignal !== "ENTER_LONG" && blockers.length === 0;

  return {
    schema: CONSENSUS_RULES.schema,
    symbol: sym,
    deskSignal: consensus.compositeSignal,
    deskPosition: consensus.compositeSignal === "ENTER_LONG" ? "LONG" : "FLAT",
    constitutionSignal: gate.signal,
    constitutionTier: gate.tier,
    constitutionChecks: `${gate.checksPassed}/${gate.checksTotal}`,
    cleared: consensus.cleared,
    permit: consensus.permit,
    alignmentScore: consensus.alignmentScore,
    weights: {
      longPct: consensus.longPct,
      holdPct: consensus.holdPct,
      bearPct: consensus.bearPct,
    },
    votes: consensus.votes,
    coreStack: consensus.coreStack,
    longLayerPass: consensus.longLayerPass,
    rules: consensus.rules,
    layers: consensus.layers,
    blockers,
    constitutionOnly,
    method:
      "Weighted 9-layer vote (constitution 2.5×) · min 55% long weight · min 4/9 layers · min 2/4 core directional · bear cap 15%",
  };
}

/**
 * @param {CmcTokenSnapshot} t
 * @param {ReturnType<typeof import("./nexus-gate.mjs").evaluateNexusGate>} gate
 * @param {object} [macro]
 */
export function composeSkillVerdict(t, gate, macro = {}, ctx = {}) {
  const benchmark = ctx.benchmark ?? null;
  const volatility = ctx.volatility ?? null;

  const momentum = evaluateMomentumSkill(t);
  const sentiment = evaluateSentimentDivergenceSkill(t);
  const regime = evaluateRegimeSkill(t, macro);
  const trend = evaluateTrendAlignmentSkill(t);
  const liquidity = evaluateLiquidityDepthSkill(t);
  const structural = evaluateStructuralQualitySkill(t);
  const relativeStrength = evaluateRelativeStrengthSkill(t, benchmark, macro);
  const volRegime = evaluateVolatilityCompressionSkill(t, volatility);

  const blockers = [];
  if (momentum.signal === "EXIT") blockers.push("momentum-exit");
  if (sentiment.flagged && (sentiment.state === "BEARISH_DIVERGE" || sentiment.state === "HEAT_WITHOUT_FLOW")) {
    blockers.push("sentiment-diverge");
  }
  if (regime.signal === "AVOID" && gate.signal === "ENTER_LONG") blockers.push("regime-avoid");
  if (regime.regime === "risk-off" && regime.positioning === "crowded-long-unwind" && gate.signal === "ENTER_LONG") {
    blockers.push("regime-unwind");
  }
  if (trend.signal === "EXIT") blockers.push("trend-distribution");
  if (trend.signal === "AVOID") blockers.push("trend-break");
  if (liquidity.signal === "AVOID") blockers.push("liquidity-thin");
  if (liquidity.signal === "EXIT") blockers.push("volume-collapse");
  if (structural.signal === "AVOID") blockers.push("structural-weak");
  if (relativeStrength.signal === "AVOID") blockers.push("rs-laggard");
  if (relativeStrength.signal === "EXIT") blockers.push("rs-fade");
  if (volRegime.signal === "AVOID") blockers.push("vol-whip");
  if (volRegime.signal === "EXIT") blockers.push("vol-expansion");

  const skillBundle = {
    momentum,
    sentiment,
    regime,
    trend,
    liquidity,
    structural,
    relativeStrength,
    volatility: volRegime,
  };

  const consensus = resolveCompositeConsensus({ gate, skills: skillBundle, blockers });
  const compositeSignal = consensus.compositeSignal;
  const alignmentScore = consensus.alignmentScore;

  const sym = (t.symbol ?? "TOKEN").toUpperCase();
  const judgeConsensus = buildJudgeConsensusBlock(sym, gate, consensus, blockers);
  const rsi = momentum.metrics.rsi;
  const alignLabel =
    alignmentScore >= 70 ? "skills aligned" : alignmentScore >= 50 ? "partial alignment" : "weak alignment";

  const constitutionOnly =
    gate.signal === "ENTER_LONG" && compositeSignal !== "ENTER_LONG" && blockers.length === 0;

  return {
    momentum,
    sentiment,
    regime,
    trend,
    liquidity,
    structural,
    relativeStrength,
    volatility: volRegime,
    composite: {
      signal: compositeSignal,
      constitutionSignal: gate.signal,
      alignmentScore,
      longPct: consensus.longPct,
      holdPct: consensus.holdPct,
      bearPct: consensus.bearPct,
      votes: consensus.votes,
      layers: consensus.layers,
      coreStack: consensus.coreStack,
      longLayerPass: consensus.longLayerPass,
      permit: consensus.permit,
      rules: consensus.rules,
      blockers,
      cleared: consensus.cleared,
      constitutionOnly,
      judgeConsensus,
      thesis:
        blockers.length > 0
          ? `${sym}: blocked (${blockers.join(", ")}) — ${gate.gaps?.[0] ?? "constitution holds flat"}.`
          : compositeSignal === "ENTER_LONG"
            ? `${sym}: ${rsi.toFixed(1)} RSI · RS ${relativeStrength.metrics.rs24h >= 0 ? "+" : ""}${relativeStrength.metrics.rs24h.toFixed(1)}% vs ${relativeStrength.metrics.benchmark} · ${volRegime.state} vol · ${liquidity.turnover} turnover · ${gate.checksPassed}/${gate.checksTotal} · ${alignLabel} (${alignmentScore}/100 · ${consensus.votes.long}/${consensus.votes.total} layers long).`
            : constitutionOnly
              ? `${sym}: constitution ${gate.tier?.toUpperCase() ?? "A"} clears (${gate.checksPassed}/${gate.checksTotal}) but skill stack not aligned (${consensus.votes.long}/${consensus.votes.total} long · ${alignmentScore}/100) — hold flat until layers agree.`
              : gate.thesis?.startsWith(sym)
                ? gate.thesis
                : `${sym}: ${gate.thesis}`,
    },
  };
}
