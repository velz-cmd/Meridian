/**
 * NEXUS Momentum Gate — deterministic pre-trade conviction system for BNB Hack Track 2.
 * Ports MERIDIAN NEXUS signal-gate discipline to CoinMarketCap MCP fields.
 * @see src/lib/signal-gate.ts
 */

/** @typedef {"LONG" | "FLAT"} Position */
/** @typedef {"ENTER_LONG" | "EXIT" | "HOLD" | "AVOID"} Signal */
/** @typedef {"a-plus" | "a" | "watch" | "avoid"} SetupTier */

/**
 * @typedef {object} CmcTokenSnapshot
 * @property {string} symbol
 * @property {number} [price]
 * @property {number} [marketCap]
 * @property {number} [volume24h]
 * @property {number} [change1h]
 * @property {number} [change24h]
 * @property {number} [change7d]
 * @property {number} [rsi]
 * @property {string} [macdSignal] bullish | bearish | neutral
 * @property {number} [fearGreed] 0-100
 * @property {number} [liquidityUsd] optional DEX overlay
 * @property {number} [buyFlowRatio] 0-1 optional (buys / (buys+sells))
 * @property {number} [top10HolderPct] optional holder concentration
 */

/** @typedef {{ id: string; label: string; pass: boolean; weight: number }} GateCheck */

/**
 * @typedef {object} NexusGateResult
 * @property {Signal} signal
 * @property {SetupTier} tier
 * @property {number} confidence
 * @property {number} risk
 * @property {number} agreement
 * @property {number} edge
 * @property {GateCheck[]} checks
 * @property {string[]} gaps
 * @property {number} checksPassed
 * @property {number} checksTotal
 * @property {string} thesis
 * @property {string} agentDirective
 */

/** @returns {boolean} */
function isEstablished(t) {
  const mc = t.marketCap ?? 0;
  const liq = t.liquidityUsd ?? 0;
  return mc >= 80_000_000 || liq >= 500_000;
}

/** Rug / pump-dump pattern flags (aligned with signal-gate.ts, CMC field proxies). */
function patternFlags(t) {
  const ch1 = t.change1h ?? 0;
  const ch24 = t.change24h ?? 0;
  const ch7 = t.change7d ?? 0;
  const rsi = t.rsi ?? 50;
  const flow = t.buyFlowRatio ?? null;

  const crimeDump = ch1 <= -8 && ch24 > 15;
  const pumpDump = ch24 > 8 && ch1 < -6;
  const pumpFade = ch1 > 12 && ch24 > 0 && ch7 < ch24 * 0.5;
  const fakeMoon = ch24 >= 80 && (ch1 < -10 || rsi > 78 || (flow != null && flow < 0.48));

  return { crimeDump, pumpDump, pumpFade, fakeMoon, hardAvoid: crimeDump || pumpDump || fakeMoon };
}

/**
 * @param {CmcTokenSnapshot} t
 * @returns {GateCheck[]}
 */
function buildChecks(t) {
  const symbol = (t.symbol ?? "TOKEN").toUpperCase();
  const rsi = t.rsi ?? 50;
  const fg = t.fearGreed ?? 50;
  const ch1 = t.change1h ?? 0;
  const ch24 = t.change24h ?? 0;
  const mc = t.marketCap ?? 0;
  const vol = t.volume24h ?? 0;
  const turnover = mc > 0 ? vol / mc : 0;
  const macd = (t.macdSignal ?? "neutral").toLowerCase();
  const flow = t.buyFlowRatio ?? null;
  const top10 = t.top10HolderPct ?? 0;
  const established = isEstablished(t);
  const { crimeDump, pumpFade, fakeMoon } = patternFlags(t);

  const momentumBand = established
    ? ch1 >= 4 || (ch24 >= -12 && ch24 <= 42) || (flow != null && flow >= 0.52)
    : ch24 >= 8 && ch24 <= 88 && !(ch24 > 45 && ch1 < -6);

  const intradayOk = established
    ? !(ch1 <= -18 && ch24 > 20) && !(crimeDump || pumpFade)
    : ch24 <= 0 || (ch1 >= -10 && !(crimeDump || pumpFade));

  const macroOk = fg <= 85;
  const taPass = rsi <= 72 && rsi >= 35;
  const walletPass = top10 === 0 || top10 < 72;
  const turnoverMax = established ? 0.35 : 0.28;

  return [
    { id: "macro_fg", label: "Fear & Greed not extreme greed (>85)", weight: 8, pass: macroOk },
    {
      id: "momentum_band",
      label: established ? "Swing momentum: 1h≥4% or healthy 24h band" : "24h momentum in 8–88% band",
      weight: 12,
      pass: momentumBand,
    },
    { id: "intraday", label: "Intraday structure not collapsing", weight: 14, pass: intradayOk },
    { id: "rsi", label: "RSI in entry band (35–72)", weight: 10, pass: taPass },
    {
      id: "macd",
      label: "MACD not bearish vs momentum",
      weight: 10,
      pass: macd !== "bearish" || ch24 < 15,
    },
    {
      id: "turnover",
      label: `Turnover sane (0.02–${turnoverMax})`,
      weight: 8,
      pass: turnover >= 0.02 && turnover <= turnoverMax,
    },
    {
      id: "flow",
      label: flow != null ? "Buy flow ≥ 52%" : "Flow n/a (CMC-only pass)",
      weight: flow != null ? 12 : 4,
      pass: flow == null ? true : flow >= 0.52,
    },
    {
      id: "holders",
      label: "Holder concentration controlled (<72% top10)",
      weight: top10 > 0 ? 10 : 4,
      pass: walletPass,
    },
    {
      id: "structure",
      label: "No rug/pump pattern flags",
      weight: 16,
      pass: !crimeDump && !pumpFade && !fakeMoon,
    },
  ];
}

function weightedAgreement(checks) {
  const total = checks.reduce((s, c) => s + c.weight, 0);
  const passed = checks.filter((c) => c.pass).reduce((s, c) => s + c.weight, 0);
  return total === 0 ? 0 : passed / total;
}

function estimateEdge(checks, fg) {
  let edge = checks.filter((c) => c.pass).length * 4;
  if (fg >= 45 && fg <= 70) edge += 8;
  if (checks.find((c) => c.id === "flow")?.pass && checks.find((c) => c.id === "flow")?.weight === 12) {
    edge += 6;
  }
  return edge;
}

function calibrateConfidence(tier, agreement, edge, risk) {
  const edgeBump = Math.min(10, Math.max(0, (edge - 28) * 0.22));
  let conf = 36 + agreement * 34 + edgeBump;
  if (tier === "a-plus") conf = Math.min(76, Math.max(58, conf));
  else if (tier === "a") conf = Math.min(66, Math.max(50, conf));
  else if (tier === "watch") conf = Math.min(52, Math.max(34, conf));
  else conf = Math.min(40, conf);
  if (risk > 72) conf = Math.min(conf, 48);
  return Math.round(conf);
}

/**
 * Core gate — default HOLD; ENTER_LONG only on A/A+ tier (mirrors enforceSignalGate bar).
 * @param {CmcTokenSnapshot} t
 * @returns {NexusGateResult}
 */
export function evaluateNexusGate(t) {
  const symbol = (t.symbol ?? "TOKEN").toUpperCase();
  const rsi = t.rsi ?? 50;
  const fg = t.fearGreed ?? 50;
  const ch24 = t.change24h ?? 0;
  const macd = (t.macdSignal ?? "neutral").toLowerCase();
  const established = isEstablished(t);
  const patterns = patternFlags(t);

  if (patterns.hardAvoid) {
    return {
      signal: "AVOID",
      tier: "avoid",
      confidence: 90,
      risk: 88,
      agreement: 0,
      edge: -30,
      checks: buildChecks(t),
      gaps: ["Chart/flow shows exit liquidity or rug pattern"],
      checksPassed: 0,
      checksTotal: 9,
      thesis: `${symbol}: AVOID — rug/pump-dump structure; no entry.`,
      agentDirective: "VETO any agent BUY signal. Force HOLD or EXIT.",
    };
  }

  const checks = buildChecks(t);
  const agreement = weightedAgreement(checks);
  const passed = checks.filter((c) => c.pass).length;
  const gaps = checks.filter((c) => !c.pass).map((c) => c.label);
  const edge = estimateEdge(checks, fg);

  let tier = /** @type {SetupTier} */ ("watch");
  if (established) {
    if (agreement >= 0.72 && edge >= 28 && passed >= 7) tier = "a-plus";
    else if (agreement >= 0.52 && edge >= 22 && passed >= 5) tier = "a";
  } else {
    if (agreement >= 0.78 && edge >= 36 && passed >= 8) tier = "a-plus";
    else if (agreement >= 0.62 && edge >= 28 && passed >= 6) tier = "a";
  }

  let signal = /** @type {Signal} */ ("HOLD");
  if (tier === "a-plus" || tier === "a") signal = "ENTER_LONG";
  else if (edge < -22 || rsi < 35 || ch24 < -20) signal = "EXIT";
  else if (agreement < 0.45 || rsi > 78 || fg > 88) {
    signal = ch24 < -15 ? "EXIT" : "AVOID";
    if (signal === "AVOID") tier = "avoid";
  }

  const risk = Math.round(
    Math.min(
      92,
      Math.max(
        14,
        50 - edge * 0.38 + (1 - agreement) * 22 + (t.liquidityUsd != null && t.liquidityUsd < 30_000 ? 16 : 0),
      ),
    ),
  );
  const confidence = calibrateConfidence(tier, agreement, edge, risk);

  const thesis =
    signal === "ENTER_LONG"
      ? tier === "a-plus"
        ? `${symbol}: A+ setup — ${passed}/${checks.length} checks, edge +${edge}. Size small; invalidate on 1h roll-over.`
        : `${symbol}: A setup — ${passed}/${checks.length} aligned; edge +${edge}. Tactical only if flow holds.`
      : signal === "EXIT" || signal === "AVOID"
        ? `${symbol}: risk-off — ${gaps.slice(0, 2).join("; ") || "structure fails gate"}. Stay flat.`
        : `${symbol}: WATCH — missing ${gaps.slice(0, 3).join("; ") || "alignment"}. No entry until gate clears.`;

  const agentDirective =
    signal === "ENTER_LONG"
      ? "Agent may propose tactical long; cap confidence at gate value."
      : signal === "HOLD"
        ? "Clamp any agent BUY to HOLD until gate clears."
        : "Force agent to HOLD or EXIT; block new size.";

  return {
    signal,
    tier,
    confidence,
    risk,
    agreement: Math.round(agreement * 1000) / 1000,
    edge,
    checks,
    gaps,
    checksPassed: passed,
    checksTotal: checks.length,
    thesis,
    agentDirective,
  };
}

/**
 * Agent override layer — clamps raw agent BUY to gate (ports enforceSignalGate).
 * @param {CmcTokenSnapshot} t
 * @param {{ action: Signal | "BUY"; confidence?: number; risk?: number; reasoning?: string }} agentSignal
 */
export function enforceAgentGate(t, agentSignal) {
  const gate = evaluateNexusGate(t);
  const rawAction = agentSignal.action === "BUY" ? "ENTER_LONG" : agentSignal.action;
  let action = rawAction;
  let confidence = agentSignal.confidence ?? gate.confidence;
  let risk = agentSignal.risk ?? gate.risk;
  let overridden = false;

  if (rawAction === "ENTER_LONG" && gate.signal !== "ENTER_LONG") {
    action = "HOLD";
    confidence = Math.min(confidence, gate.confidence);
    risk = Math.max(risk, gate.risk);
    overridden = true;
  } else if (gate.tier === "avoid" || (rawAction === "HOLD" && gate.signal === "EXIT")) {
    action = gate.signal === "AVOID" ? "AVOID" : "EXIT";
    confidence = Math.max(confidence, gate.confidence, 88);
    risk = Math.max(risk, gate.risk, 88);
    overridden = true;
  }

  return {
    ...gate,
    agentInput: agentSignal,
    finalAction: action,
    confidence,
    risk,
    overridden,
    reasoning: overridden
      ? `${agentSignal.reasoning ?? ""} · Gate veto: ${gate.thesis}`.trim()
      : agentSignal.reasoning ?? gate.thesis,
  };
}

/** Structured output for Agent Hub chaining. */
export function toStructuredOutput(t, result = evaluateNexusGate(t)) {
  return {
    schema: "nexus-momentum-gate/v1",
    symbol: (t.symbol ?? "TOKEN").toUpperCase(),
    timestamp: new Date().toISOString(),
    signal: result.signal,
    tier: result.tier,
    confidence: result.confidence,
    risk: result.risk,
    agreement: result.agreement,
    edge: result.edge,
    checks: result.checks.map((c) => ({
      id: c.id,
      pass: c.pass,
      weight: c.weight,
      label: c.label,
    })),
    checksPassed: result.checksPassed,
    checksTotal: result.checksTotal,
    gaps: result.gaps,
    thesis: result.thesis,
    agentDirective: result.agentDirective,
    inputs: {
      price: t.price ?? null,
      change1h: t.change1h ?? null,
      change24h: t.change24h ?? null,
      change7d: t.change7d ?? null,
      rsi: t.rsi ?? null,
      macdSignal: t.macdSignal ?? null,
      fearGreed: t.fearGreed ?? null,
    },
  };
}

/**
 * @param {import("./nexus-gate.mjs").Signal} signal
 * @param {Position} current
 */
export function nextPosition(signal, current = "FLAT") {
  if (signal === "ENTER_LONG") return "LONG";
  if (signal === "EXIT" || signal === "AVOID") return "FLAT";
  return current;
}

/**
 * Backtest with drawdown, win rate, and trade log.
 * @param {CmcTokenSnapshot[]} series oldest first
 * @param {{ feeBps?: number; slippageBps?: number }} opts
 */
export function backtestSeries(series, opts = {}) {
  const fee = (opts.feeBps ?? 10) / 10_000;
  const slip = (opts.slippageBps ?? 0) / 10_000;
  let position = /** @type {Position} */ ("FLAT");
  let equity = 1;
  let peak = 1;
  let maxDrawdown = 0;
  const trades = [];
  const roundTrips = [];

  for (let i = 1; i < series.length; i++) {
    const snap = series[i];
    const prev = series[i - 1];
    const price = snap.price ?? prev.price ?? 1;
    const prevPrice = prev.price ?? price;

    if (position === "LONG") {
      equity *= price / prevPrice;
    }

    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak > 0 ? (peak - equity) / peak : 0);

    const { signal } = evaluateNexusGate(snap);
    const next = nextPosition(signal, position);

    if (next !== position) {
      if (position === "LONG") {
        equity *= 1 - fee - slip;
        const lastBuy = trades.filter((x) => x.type === "buy").pop();
        if (lastBuy) {
          const pnlPct = ((price - lastBuy.price) / lastBuy.price) * 100;
          roundTrips.push({ entry: lastBuy.price, exit: price, pnlPct, bars: i - lastBuy.index });
        }
        trades.push({ type: "sell", index: i, price, signal, equity });
      }
      if (next === "LONG") {
        equity *= 1 - fee - slip;
        trades.push({ type: "buy", index: i, price, signal, equity });
      }
      position = next;
    }
  }

  if (position === "LONG" && series.length) {
    equity *= 1 - fee - slip;
    const lastBuy = trades.filter((x) => x.type === "buy").pop();
    const lastPrice = series[series.length - 1].price ?? 1;
    if (lastBuy) {
      roundTrips.push({
        entry: lastBuy.price,
        exit: lastPrice,
        pnlPct: ((lastPrice - lastBuy.price) / lastBuy.price) * 100,
        bars: series.length - 1 - lastBuy.index,
        open: true,
      });
    }
  }

  const wins = roundTrips.filter((t) => t.pnlPct > 0).length;
  const winRate = roundTrips.length ? wins / roundTrips.length : 0;
  const avgWin =
    wins > 0
      ? roundTrips.filter((t) => t.pnlPct > 0).reduce((s, t) => s + t.pnlPct, 0) / wins
      : 0;
  const losses = roundTrips.filter((t) => t.pnlPct <= 0);
  const avgLoss =
    losses.length > 0 ? losses.reduce((s, t) => s + t.pnlPct, 0) / losses.length : 0;

  return {
    totalReturnPct: Math.round((equity - 1) * 10000) / 100,
    maxDrawdownPct: Math.round(maxDrawdown * 10000) / 100,
    winRatePct: Math.round(winRate * 10000) / 100,
    roundTrips: roundTrips.length,
    trades: trades.length,
    avgWinPct: Math.round(avgWin * 100) / 100,
    avgLossPct: Math.round(avgLoss * 100) / 100,
    tradeLog: trades,
    roundTripLog: roundTrips,
    finalEquity: Math.round(equity * 1000000) / 1000000,
    bars: series.length,
  };
}

/**
 * Naive momentum agent — buys on green 24h, no constitution (baseline for counterfactual).
 * @param {CmcTokenSnapshot[]} series
 */
export function backtestNaiveAgent(series, opts = {}) {
  const fee = (opts.feeBps ?? 10) / 10_000;
  const slip = (opts.slippageBps ?? 0) / 10_000;
  let position = /** @type {Position} */ ("FLAT");
  let equity = 1;
  let peak = 1;
  let maxDrawdown = 0;
  const trades = [];
  const roundTrips = [];

  for (let i = 1; i < series.length; i++) {
    const snap = series[i];
    const prev = series[i - 1];
    const price = snap.price ?? prev.price ?? 1;
    const prevPrice = prev.price ?? price;
    const ch24 = snap.change24h ?? 0;
    const ch1 = snap.change1h ?? 0;

    if (position === "LONG") equity *= price / prevPrice;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak > 0 ? (peak - equity) / peak : 0);

    let signal = /** @type {Signal} */ ("HOLD");
    if (ch24 > 0 && ch1 > -12) signal = "ENTER_LONG";
    if (ch24 < -8 || ch1 < -18) signal = "EXIT";

    const next = nextPosition(signal, position);
    if (next !== position) {
      if (position === "LONG") {
        equity *= 1 - fee - slip;
        const lastBuy = trades.filter((x) => x.type === "buy").pop();
        if (lastBuy) {
          roundTrips.push({
            entry: lastBuy.price,
            exit: price,
            pnlPct: ((price - lastBuy.price) / lastBuy.price) * 100,
            bars: i - lastBuy.index,
          });
        }
        trades.push({ type: "sell", index: i, price, signal: "EXIT", equity });
      }
      if (next === "LONG") {
        equity *= 1 - fee - slip;
        trades.push({ type: "buy", index: i, price, signal: "ENTER_LONG", equity });
      }
      position = next;
    }
  }

  if (position === "LONG" && series.length) {
    equity *= 1 - fee - slip;
    const lastBuy = trades.filter((x) => x.type === "buy").pop();
    const lastPrice = series[series.length - 1].price ?? 1;
    if (lastBuy) {
      roundTrips.push({
        entry: lastBuy.price,
        exit: lastPrice,
        pnlPct: ((lastPrice - lastBuy.price) / lastBuy.price) * 100,
        bars: series.length - 1 - lastBuy.index,
        open: true,
      });
    }
  }

  const wins = roundTrips.filter((t) => t.pnlPct > 0).length;
  const winRate = roundTrips.length ? wins / roundTrips.length : 0;

  return {
    label: "naive-momentum-agent",
    totalReturnPct: Math.round((equity - 1) * 10000) / 100,
    maxDrawdownPct: Math.round(maxDrawdown * 10000) / 100,
    winRatePct: Math.round(winRate * 10000) / 100,
    roundTrips: roundTrips.length,
    trades: trades.length,
    bars: series.length,
  };
}

/** Side-by-side proof: constitution vs naive agent on same bars. */
export function backtestCompare(series, opts = {}) {
  const constitution = backtestSeries(series, opts);
  const naiveAgent = backtestNaiveAgent(series, opts);
  return {
    constitution,
    naiveAgent,
    edge: {
      returnDeltaPct: Math.round((constitution.totalReturnPct - naiveAgent.totalReturnPct) * 100) / 100,
      drawdownSavedPct: Math.round((naiveAgent.maxDrawdownPct - constitution.maxDrawdownPct) * 100) / 100,
      winRateDeltaPct: Math.round((constitution.winRatePct - naiveAgent.winRatePct) * 100) / 100,
    },
  };
}

/**
 * Issue a trade permit — runtime product of the CMC Strategy Skill.
 * @param {CmcTokenSnapshot} t
 * @param {{ action?: string; confidence?: number; reasoning?: string } | null} agentSignal
 */
export function issueConstitutionPermit(t, agentSignal = null) {
  const sym = (t.symbol ?? "TOKEN").toUpperCase();
  const gate = evaluateNexusGate(t);
  const structured = toStructuredOutput(t, gate);
  const ts = new Date().toISOString();
  const permitId = `perm_${sym}_${Date.now().toString(36)}`;

  let veto = null;
  let finalAction = gate.signal;
  let overridden = false;

  if (agentSignal?.action) {
    veto = enforceAgentGate(t, {
      action: agentSignal.action,
      confidence: agentSignal.confidence,
      reasoning: agentSignal.reasoning,
    });
    finalAction = veto.finalAction;
    overridden = veto.overridden;
  }

  const grant =
    finalAction === "ENTER_LONG" ||
    (agentSignal?.action === "SELL" && (gate.signal === "EXIT" || gate.signal === "AVOID"));

  return {
    schema: "meridian-constitution-permit/v1",
    permitId,
    timestamp: ts,
    symbol: sym,
    status: grant ? "GRANT" : "DENY",
    execute: grant ? (finalAction === "ENTER_LONG" ? "LONG" : "FLAT") : "FLAT",
    agentRequested: agentSignal?.action ?? null,
    constitutionSignal: gate.signal,
    finalAction,
    overridden,
    tier: gate.tier,
    confidence: veto?.confidence ?? gate.confidence,
    risk: veto?.risk ?? gate.risk,
    thesis: veto?.reasoning ?? gate.thesis,
    gate: structured,
    veto,
  };
}
