/**
 * MERIDIAN Strategy Skills — CMC-powered, deterministic, backtest-compatible.
 * Three skills compose the constitution before permit:
 *  1. Momentum — RSI + MACD + Fear & Greed entry/exit
 *  2. Sentiment divergence — price attention vs volume flow (CMC proxies)
 *  3. Regime — macro positioning + strategy mode switch
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
    const ch24 = t.change24h ?? 0;
    const ch7 = t.change7d ?? 0;
    if (positioning === "crowded-long-unwind") signal = "AVOID";
    else if (positioning === "capitulation") {
      signal = ch7 > 3 && ch24 > -4 ? "ENTER_LONG" : Math.abs(ch24) < 1.5 ? "HOLD" : ch24 < -4 ? "HOLD" : "ENTER_LONG";
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
 * Compose three skills + base gate into one auditable verdict.
 * @param {CmcTokenSnapshot} t
 * @param {ReturnType<typeof import("./nexus-gate.mjs").evaluateNexusGate>} gate
 * @param {object} [macro]
 */
export function composeSkillVerdict(t, gate, macro = {}) {
  const momentum = evaluateMomentumSkill(t);
  const sentiment = evaluateSentimentDivergenceSkill(t);
  const regime = evaluateRegimeSkill(t, macro);

  const blockers = [];
  if (momentum.signal === "EXIT") blockers.push("momentum-exit");
  if (sentiment.flagged && (sentiment.state === "BEARISH_DIVERGE" || sentiment.state === "HEAT_WITHOUT_FLOW")) {
    blockers.push("sentiment-diverge");
  }
  if (regime.regime === "risk-off" && regime.positioning === "crowded-long-unwind" && gate.signal === "ENTER_LONG") {
    blockers.push("regime-unwind");
  }
  if (regime.strategyMode === "defensive" && gate.signal === "ENTER_LONG") {
    blockers.push("regime-defensive");
  }

  const skillsAligned =
    momentum.signal === "ENTER_LONG" ||
    (momentum.signal === "HOLD" && sentiment.signal === "ENTER_LONG" && !sentiment.flagged);

  let compositeSignal = gate.signal;
  if (blockers.length > 0 && gate.signal === "ENTER_LONG") {
    compositeSignal = "HOLD";
  } else if (skillsAligned && sentiment.signal === "ENTER_LONG" && momentum.signal !== "EXIT") {
    compositeSignal = gate.signal === "ENTER_LONG" ? "ENTER_LONG" : gate.signal;
  }

  const alignmentScore = Math.round(
    ((momentum.checksPassed / momentum.checksTotal) * 34 +
      (sentiment.flagged ? 0 : 33) +
      (regime.regime === "neutral" || regime.regime === "risk-on" ? 33 : regime.regime === "risk-off" ? 12 : 20)),
  );

  const sym = (t.symbol ?? "TOKEN").toUpperCase();
  const rsi = momentum.metrics.rsi;
  const alignLabel = alignmentScore >= 70 ? "skills aligned" : alignmentScore >= 50 ? "partial alignment" : "weak alignment";

  return {
    momentum,
    sentiment,
    regime,
    composite: {
      signal: compositeSignal,
      alignmentScore,
      blockers,
      cleared: blockers.length === 0 && compositeSignal === "ENTER_LONG",
      thesis:
        blockers.length > 0
          ? `${sym}: blocked (${blockers.join(", ")}) — ${gate.gaps?.[0] ?? "constitution holds flat"}.`
          : compositeSignal === "ENTER_LONG"
            ? `${sym}: ${rsi.toFixed(1)} RSI · ${sentiment.state.replace(/_/g, " ").toLowerCase()} · ${gate.checksPassed}/${gate.checksTotal} checks · edge +${gate.edge ?? 0} · ${alignLabel} (${alignmentScore}/100).`
            : `${sym}: ${gate.thesis}`,
    },
  };
}
