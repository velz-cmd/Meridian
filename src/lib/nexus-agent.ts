import { randomUUID } from "crypto";
import { getAiClient, getAiModel } from "./ai-client";
import { fetchCryptoNewsHeadlines } from "./crypto-news";
import { pickCommunityBuzz } from "./community-pulse";
import { usePremiumSocialApis } from "./social-config";
import { fetchTrendingMarketTokens, fetchSwappableTokens, type TrendingToken } from "./dexscreener";
import { buildDeepTokenIntel } from "./deep-token-analysis";
import { buildLocalTokenIntel } from "./token-intel-local";
import { checkSwappable } from "./swappable";
import { anchorDecisionPayload } from "./arc";
import { addNexusDecision, type NexusDecision, type TokenIntel, type AgentSignal, type ReasoningFactor } from "./storage";
import { assessTokenScam, applyScamAndSecurity } from "./scam-detection";
import {
  enforceSignalGate,
  evaluateTradeSetup,
  NEXUS_SIGNAL_GATE_PROMPT,
} from "./signal-gate";
import { fetchTokenByAddress } from "./dexscreener";
import { getMacroRegime, macroRegimeGuidance, type MacroRegime } from "./macro-regime";
import { hasBirdeyeKey } from "./birdeye-client";
import { resolveTokenTechnical, technicalToIntel } from "./market-ta";
import type { TokenSocialIntel } from "./social-intel";
import { formatTokenPrice } from "./utils";
import { filterReasoningFactorsForDisplay } from "./reasoning-factors";
import type { ScamAssessment } from "./scam-detection";
import type { TokenSecurityReport } from "./token-security";
import { computeNexusEdgeScore, edgeFactorsToReasoning } from "./nexus-edge-score";

/** Wallet-first edge factors — DexScreener structure + holders + GoPlus/honeypot + narrative; TA secondary. */
function buildReasoningFactors(
  token: TrendingToken,
  intel: TokenIntel,
  _action: NexusDecision["action"],
  macro?: MacroRegime | null,
  risk?: {
    security?: TokenSecurityReport;
    scam?: ScamAssessment;
  },
): ReasoningFactor[] {
  const breakdown = computeNexusEdgeScore({
    token,
    intel,
    macro,
    security: risk?.security,
    scam: risk?.scam,
  });
  return filterReasoningFactorsForDisplay(edgeFactorsToReasoning(breakdown.factors, 8), 8);
}

function normalizePct(n: number | undefined, fallback: number) {
  if (n == null || Number.isNaN(n)) return fallback;
  if (n > 0 && n <= 1) return Math.round(n * 100);
  return Math.round(Math.min(100, Math.max(0, n)));
}

function scoreFactorEdge(factors: ReasoningFactor[]) {
  let bull = 0;
  let bear = 0;
  for (const f of factors) {
    const w = f.weight ?? 10;
    if (f.impact === "bullish") bull += w;
    else if (f.impact === "bearish") bear += w;
  }
  return { bull, bear, edge: bull - bear };
}

function buildWhyAction(
  action: NexusDecision["action"],
  token: TrendingToken,
  factors: ReasoningFactor[],
  edge: number,
): string {
  const top = [...factors].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)).slice(0, 3);
  const cites = top.map((f) => `${f.label}: ${f.detail}`).join(" · ");

  if (action === "HOLD") {
    return `${token.symbol} @ ${formatTokenPrice(token.priceUsd)} — ${cites}. Desk WATCH: edge ${edge > 0 ? "+" : ""}${edge.toFixed(0)} — wait for liq + 1h structure + flow alignment.`;
  }
  if (action === "BUY") {
    return `${token.symbol} — ${cites}. Desk entry edge +${edge.toFixed(0)} · 24h ${token.change24h >= 0 ? "+" : ""}${token.change24h.toFixed(1)}% · liq $${(token.liquidityUsd / 1000).toFixed(0)}K — tactical clip only if gate holds.`;
  }
  return `${token.symbol} — ${cites}. Desk risk-off edge ${edge.toFixed(0)} · 24h ${token.change24h.toFixed(1)}% — cut exposure; flow/chart against upside.`;
}

async function applyFeedDeskNarrative(
  token: TrendingToken,
  intel: TokenIntel,
  signal: AgentSignal,
  security: import("./token-security").TokenSecurityReport,
  scam: ScamAssessment,
  macro: MacroRegime | null,
): Promise<AgentSignal> {
  if (security.honeypotRisk || scam.isScam) return signal;
  const { buildTokenAgentNarrative, narrativeToWhyAction, edgeFromReasoningFactors } =
    await import("./nexus-token-narrative");
  const { evaluateTradeSetup } = await import("./signal-gate");
  const edge = edgeFromReasoningFactors(signal.reasoningFactors);
  const gate = evaluateTradeSetup({ token, intel, edge, macro, security, scam });
  const bundle = buildTokenAgentNarrative(token, intel, signal, "feed", {
    securityLabel: security.label,
    gate,
  });
  return {
    ...signal,
    whyAction: narrativeToWhyAction(bundle, 220),
    reasoning: bundle.narrative.slice(0, 480),
  };
}

function heuristicDecision(
  token: TrendingToken,
  intel: TokenIntel,
  macro?: MacroRegime | null,
  risk?: { security?: TokenSecurityReport; scam?: ScamAssessment },
): Pick<
  NexusDecision,
  | "action"
  | "confidence"
  | "riskScore"
  | "reasoning"
  | "whyAction"
  | "reasoningFactors"
  | "deskVerdict"
> {
  const security = risk?.security;
  const scam =
    risk?.scam ??
    (security ? assessTokenScam(token, intel, security) : assessTokenScam(token, intel));

  if (security?.honeypotRisk || scam.scamType === "honeypot") {
    const factors = buildReasoningFactors(token, intel, "SELL", macro, { security, scam });
    return {
      action: "SELL",
      confidence: Math.max(90, scam.maxConfidence),
      riskScore: 92,
      reasoning: `Honeypot / trap risk on ${token.symbol} despite ${token.change24h.toFixed(1)}% 24h — ${scam.flags[0] ?? security?.label ?? "exit blocked"}.`,
      whyAction: `${token.symbol}: honeypot risk — AVOID; do not size into green 24h tape.`,
      reasoningFactors: factors,
      deskVerdict: "AVOID",
    };
  }

  if (scam.isScam && scam.severity >= 35) {
    const factors = buildReasoningFactors(token, intel, "SELL", macro, { security, scam });
    return {
      action: "SELL",
      confidence: Math.max(88, scam.maxConfidence),
      riskScore: Math.max(85, scam.severity),
      reasoning: `${scam.label}: ${scam.flags.join("; ")}`,
      whyAction: `${token.symbol}: ${scam.flags[0] ?? scam.label} — rug/pump-dump pattern; AVOID entry.`,
      reasoningFactors: factors,
      deskVerdict: "AVOID",
    };
  }

  const draftFactors = buildReasoningFactors(token, intel, "HOLD", macro, { security, scam });
  const { edge } = scoreFactorEdge(draftFactors);

  const gate = evaluateTradeSetup({
    token,
    intel,
    edge,
    macro,
    security,
    scam,
  });

  const action = gate.action;
  const finalFactors = buildReasoningFactors(token, intel, action, macro, { security, scam });
  const { edge: finalEdge } = scoreFactorEdge(finalFactors);

  const top = [...finalFactors].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)).slice(0, 4);
  const reasoning = `${top.map((f) => `${f.label}: ${f.detail}`).join(" · ")} · Gate ${gate.checksPassed}/${gate.checksTotal} (${gate.tier})`;

  return {
    action,
    confidence: gate.confidence,
    riskScore: gate.riskScore,
    reasoning,
    whyAction:
      action === "HOLD"
        ? gate.thesis
        : buildWhyAction(action, token, finalFactors, finalEdge),
    reasoningFactors: finalFactors,
  };
}

async function enrichToken(token: TrendingToken, deep = true) {
  if (token.intel?.technical && !deep) return token.intel;
  if (deep) {
    const bundle = await buildDeepTokenIntel(token);
    return bundle.intel;
  }
  return token.intel ?? buildLocalTokenIntel(token);
}

async function aiDecision(token: TrendingToken, intel: TokenIntel) {
  const client = getAiClient();
  const fallback = heuristicDecision(token, intel);

  if (!client) return fallback;

  const bundle = await buildDeepTokenIntel(token);
  const intelMerged = { ...intel, ...bundle.intel };

  try {
    const completion = await client.chat.completions.create({
      model: getAiModel(),
      temperature: 0.45,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are NEXUS, a professional crypto trading agent. Each token analysis MUST be unique — cite specific numbers from the payload (price, % change, liquidity, volume, RSI, MACD, news headlines). If 5m or 1h price change shows a crime dump or pump-then-dump while 24h is still positive, you MUST return SELL with confidence under 40 — never HOLD or BUY on obvious rugs/honeypots. Never reuse the same confidence/risk for different tokens. Return JSON: action (BUY|SELL|HOLD), confidence (0-100), riskScore (0-100), reasoning (2-3 sentences with unique metrics), whyAction (one sentence naming this token's edge).",
        },
        {
          role: "user",
          content: JSON.stringify({
            token,
            intel: intelMerged,
            turnoverRatio: bundle.turnoverRatio,
            buySellRatio: bundle.buySellRatio,
            headlines: bundle.news,
            community: bundle.community.headlines,
            social: bundle.social,
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      action?: NexusDecision["action"];
      confidence?: number;
      riskScore?: number;
      reasoning?: string;
      whyAction?: string;
    };

    const action = parsed.action ?? fallback.action;
    const factors = buildReasoningFactors(token, intelMerged, action);
    const { edge } = scoreFactorEdge(factors);

    return enforceSignalGate(
      token,
      intelMerged,
      {
        action,
        confidence: normalizePct(parsed.confidence, fallback.confidence),
        riskScore: normalizePct(parsed.riskScore, fallback.riskScore),
        reasoning: parsed.reasoning ?? fallback.reasoning,
        whyAction: parsed.whyAction ?? buildWhyAction(action, token, factors, edge),
        reasoningFactors: factors,
      },
      { macro: await getMacroRegime() },
    );
  } catch (error) {
    console.warn("OpenAI unavailable:", error);
    return fallback;
  }
}

export async function buildDecision(token: TrendingToken, arcFeeTxHash?: string): Promise<NexusDecision> {
  const swapCheck = checkSwappable(token);
  const intel = await enrichToken(token, true);
  const { scoreTokenSecurity } = await import("./token-security");
  const security = scoreTokenSecurity(token, intel);
  const scam = assessTokenScam(token, intel, security);
  const coreRaw = await aiDecision(token, intel);
  const core = applyScamAndSecurity(token, intel, coreRaw, security, scam);
  const payload = JSON.stringify({ product: "NEXUS", token: token.tokenAddress, ...core });
  const anchor = await anchorDecisionPayload(payload);

  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    token: token.tokenAddress,
    symbol: token.symbol,
    name: token.name,
    chainId: token.chainId,
    pairAddress: token.pairAddress,
    dexUrl: token.url,
    icon: token.icon,
    priceUsd: token.priceUsd,
    change24h: token.change24h,
    volume24h: token.volume24h,
    liquidityUsd: token.liquidityUsd,
    intel,
    swappable: swapCheck.ok,
    swapCriteriaMet: swapCheck.reasons,
    ...core,
    arcTxHash: anchor.txHash ?? arcFeeTxHash,
    arcBlockNumber: anchor.blockNumber,
    arcFeeTxHash,
    settlementNetwork: "BSC Testnet",
    feeCurrency: "USDC",
    technical: intel.technical,
  };
}

async function refreshTokenFromDex(token: TrendingToken): Promise<TrendingToken> {
  const fresh = await fetchTokenByAddress(token.chainId, token.tokenAddress);
  if (!fresh) return token;
  return { ...token, ...fresh, intel: token.intel };
}

async function analyzeTokenForMemoryScan(
  token: TrendingToken,
  tokenIndex = 0,
  scanKind: "memory" | "alpha" = "memory",
) {
  const { scoreTokenSecurity } = await import("./token-security");
  const { mergeGmgnIntoSecurityReport } = await import("./gmgn-enrichment");
  const fresh =
    scanKind === "alpha" && tokenIndex >= 5 ? token : await refreshTokenFromDex(token);
  const bundle = await buildDeepTokenIntel(fresh, {
    scanKind,
    tokenIndex,
    skipGmgnEnrich: scanKind === "alpha" && tokenIndex >= 3,
  });
  const intel = bundle.intel;
  let security = scoreTokenSecurity(fresh, intel);
  if (bundle.gmgnSecurity) {
    security = mergeGmgnIntoSecurityReport(security, bundle.gmgnSecurity);
  }
  const scam = assessTokenScam(fresh, intel, security);
  if (scam.isScam) {
    security.scamRisk = true;
    security.scamLabel = scam.label;
    security.scamType = scam.scamType ?? undefined;
    security.honeypotRisk = security.honeypotRisk || scam.severity >= 50;
    security.label = scam.label;
    security.flags = [...new Set([...security.flags, ...scam.flags])].slice(0, 8);
  }
  const macro = await getMacroRegime();
  let signal = heuristicDecision(fresh, intel, macro, { security, scam });
  signal = enforceSignalGate(fresh, intel, signal, { macro, security, scam });
  signal = applyScamAndSecurity(fresh, intel, signal, security, scam);
  return {
    token: { ...fresh, intel },
    intel,
    signal,
    security,
    scam,
    news: bundle.news,
    social: bundle.social,
    community: bundle.community,
    gmgnLines: bundle.gmgnLines,
    gmgnSecurity: bundle.gmgnSecurity,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function mapWithConcurrencySafe<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R | null>,
  concurrency: number,
  label = "task",
): Promise<R[]> {
  const results: (R | null)[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = await fn(items[i], i);
      } catch (error) {
        console.warn(`[nexus] ${label} failed for item ${i}:`, error);
        results[i] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results.filter((r): r is R => r != null);
}

export type AlphaOpportunity = {
  rank: number;
  symbol: string;
  name: string;
  tokenAddress: string;
  chainId: string;
  priceUsd: number;
  change24h: number;
  action: AgentSignal["action"];
  confidence: number;
  /** Legacy composite; see alphaScore for probabilistic model */
  opportunityScore: number;
  alphaScore: number;
  narrativeAcceleration: number;
  narrativeSummary: string;
  smartMoneySignal: string;
  momentumHealth: string;
  riskScore: number;
  riskBreakdown: { rug: number; liquidity: number; concentration: number; hypeExhaustion: number };
  aiThesis: string;
  ecosystemTags: string[];
  reasoning: string;
  whyAction: string;
  newsHeadlines: string[];
  socialBuzz?: string;
  apeWisdomRank?: number;
  apeMentions?: number;
  galaxyScore?: number;
  socialDegraded?: string;
  githubDevSummary?: string;
  icon?: string;
  liquidityUsd: number;
  volume24h: number;
  /** Discovery tags e.g. GMGN signal, DexScreener */
  sourceTags?: string[];
  marketSentiment?: string;
  sentimentScore?: number;
  intelLayers?: string[];
  /** One-line pro dossier for alpha cards (cheap heuristic) */
  researchGlance?: string;
  reasoningFactors?: AgentSignal["reasoningFactors"];
};

function scoreOpportunity(
  token: TrendingToken,
  signal: AgentSignal,
  intel: TokenIntel,
  social?: TokenSocialIntel,
  newsCount = 0,
): number {
  let score = signal.confidence;
  if (signal.action === "BUY") score += 14;
  else if (signal.action === "HOLD") score += 2;
  else score -= 18;
  if (intel.technical?.score) score += intel.technical.score * 0.15;
  if (token.liquidityUsd > 150_000) score += 12;
  else if (token.liquidityUsd > 50_000) score += 6;
  if (token.change24h > 5 && token.change24h < 80) score += 8;
  if ((token.txns24h?.buys ?? 0) > (token.txns24h?.sells ?? 1)) score += 6;
  if (newsCount > 0) score += 6;
  if (social?.lunarcrush?.galaxyScore && social.lunarcrush.galaxyScore >= 60) score += 8;
  if ((social?.reddit.length ?? 0) > 0) score += 5;
  if (social?.hasData) score += 4;
  score -= Math.min(40, signal.riskScore * 0.35);
  return Math.round(Math.min(100, Math.max(0, score)));
}

/** Memory scan — deep intel archive for Agent Memory tab */
export async function runNexusScan(limit = 15, preferredChain?: string, arcFeeTxHash?: string) {
  const { filterTradableTokens } = await import("./token-filters");
  const { fetchStableMarketFeed } = await import("./dexscreener");
  const raw = await fetchStableMarketFeed(Math.min(limit * 2, 30));
  const tokens = filterTradableTokens(raw).slice(0, limit);
  if (tokens.length === 0) {
    throw new Error("No tradable tokens found (stablecoins excluded). Check DexScreener connection.");
  }

  const analyzed = await mapWithConcurrencySafe(
    tokens,
    (token) => analyzeTokenForMemoryScan(token),
    3,
    "memory-scan",
  );
  const anchor = arcFeeTxHash
    ? await anchorDecisionPayload(JSON.stringify({ product: "NEXUS", scan: Date.now(), count: tokens.length }))
    : { txHash: undefined as string | undefined, blockNumber: undefined as number | undefined };

  const decisions: NexusDecision[] = [];
  for (const { token, intel, signal } of analyzed) {
    const swapCheck = checkSwappable(token);
    const decision: NexusDecision = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      token: token.tokenAddress,
      symbol: token.symbol,
      name: token.name,
      chainId: token.chainId,
      pairAddress: token.pairAddress,
      dexUrl: token.url,
      icon: token.icon,
      priceUsd: token.priceUsd,
      change24h: token.change24h,
      volume24h: token.volume24h,
      liquidityUsd: token.liquidityUsd,
      intel,
      swappable: swapCheck.ok,
      swapCriteriaMet: swapCheck.reasons,
      action: signal.action,
      confidence: signal.confidence,
      riskScore: signal.riskScore,
      reasoning: signal.reasoning,
      whyAction: signal.whyAction,
      reasoningFactors: signal.reasoningFactors,
      arcTxHash: anchor.txHash ?? arcFeeTxHash,
      arcBlockNumber: anchor.blockNumber,
      arcFeeTxHash,
      settlementNetwork: "BSC Testnet",
      feeCurrency: "USDC",
      technical: intel.technical,
    };
    await addNexusDecision(decision);
    decisions.push(decision);
  }

  return {
    tokens,
    decisions,
    count: decisions.length,
    scanMode: "memory" as const,
    criteria: "memory-15|dexscreener|birdeye|news|meme-news|scam-check|ta|macro",
  };
}

/** Alpha scan — rank up to 20 opportunities (news + meme headlines + on-chain + AI) */
export async function runAlphaScan(
  limit = 20,
  opts?: {
    preferredChain?: string;
    focusToken?: TrendingToken;
    liveFeedKeys?: string[];
    liveFeedSymbolKeys?: string[];
  },
) {
  const { filterAlphaScanTokens, filterTradableTokens, isStablecoin } = await import("./token-filters");
  const { fetchStableMarketFeed, fetchTokenByAddress, fetchTrendingMarketTokens } =
    await import("./dexscreener");
  const { fetchGeckoAlphaCandidates, mergeTrendingWithGecko } = await import("./geckoterminal");
  const {
    curateAlphaCandidates,
    dedupeFeedTokens,
    scoreAlphaCandidate,
    symbolChainKey,
    tokenKey,
  } = await import("./feed-curation");
  const { ALPHA_MAX_LIVE_OVERLAP } = await import("./feed-config");
  const { enrichTokensWithIcons } = await import("./token-icons");

  const { buildAlphaScanUniverse } = await import("./alpha-scan-engine");
  const liveKeys = new Set((opts?.liveFeedKeys ?? []).map((k) => k.toLowerCase()));
  const liveSymbolKeys = new Set(
    (opts?.liveFeedSymbolKeys ?? []).map((k) => k.toLowerCase()),
  );
  if (liveKeys.size === 0) {
    const live = filterAlphaScanTokens(await fetchStableMarketFeed(15));
    for (const t of live) {
      liveKeys.add(tokenKey(t));
      liveSymbolKeys.add(symbolChainKey(t));
    }
  }

  const [dexFeed, geckoFeed] = await Promise.all([
    fetchTrendingMarketTokens(Math.min(limit * 3, 45), { stable: true, discovery: false }),
    fetchGeckoAlphaCandidates(["base", "arbitrum", "eth", "solana"], 12),
  ]);
  const { candidates: mergedCandidates, intel: scanIntel } = await buildAlphaScanUniverse(
    dexFeed,
    geckoFeed,
  );
  const candidateMap = new Map(
    mergedCandidates.map((c) => [`${c.chainId}:${c.tokenAddress.toLowerCase()}`, c]),
  );
  const geckoHot = new Set(
    geckoFeed.map((t) => `${t.chainId}:${t.tokenAddress.toLowerCase()}`),
  );

  const merged = mergeTrendingWithGecko(
    mergedCandidates,
    [],
    Math.min(limit * 2, 45),
  );
  let tokens: TrendingToken[] = dedupeFeedTokens(
    curateAlphaCandidates(
      filterAlphaScanTokens(merged),
      liveKeys,
      limit,
      ALPHA_MAX_LIVE_OVERLAP,
      liveSymbolKeys,
    ),
  );
  if (tokens.length < Math.min(limit, 6)) {
    const dexFallback = dedupeFeedTokens(
      filterAlphaScanTokens(mergeTrendingWithGecko(dexFeed, geckoFeed, limit * 2)),
    )
      .filter((t) => {
        const k = tokenKey(t);
        const sym = symbolChainKey(t);
        return !liveKeys.has(k) && !liveSymbolKeys.has(sym);
      })
      .sort((a, b) => scoreAlphaCandidate(b) - scoreAlphaCandidate(a))
      .slice(0, limit);
    for (const t of dexFallback) {
      const k = tokenKey(t);
      if (!tokens.some((x) => tokenKey(x) === k)) {
        tokens.push(t);
      }
      if (tokens.length >= limit) break;
    }
  }
  if (tokens.length < Math.min(limit, 8)) {
    const gmgnOnly = dedupeFeedTokens(filterAlphaScanTokens(mergedCandidates))
      .filter((t) => {
        const k = tokenKey(t);
        const sym = symbolChainKey(t);
        return !liveKeys.has(k) && !liveSymbolKeys.has(sym);
      })
      .slice(0, limit);
    const seen = new Set(tokens.map((t) => tokenKey(t)));
    for (const t of gmgnOnly) {
      const k = tokenKey(t);
      if (!seen.has(k)) {
        tokens.push(t);
        seen.add(k);
      }
      if (tokens.length >= limit) break;
    }
  }

  if (opts?.focusToken) {
    const focus = opts.focusToken;
    const key = `${focus.chainId}:${focus.tokenAddress.toLowerCase()}`;
    const loaded = await fetchTokenByAddress(focus.chainId, focus.tokenAddress);
    const fresh: TrendingToken = {
      ...focus,
      ...loaded,
      intel: focus.intel ?? loaded?.intel ?? buildLocalTokenIntel(loaded ?? focus),
    };
    const focusStable = isStablecoin(fresh.symbol, fresh.name, {
      tokenAddress: fresh.tokenAddress,
      chainId: fresh.chainId,
      priceUsd: fresh.priceUsd,
      change24h: fresh.change24h,
    });
    tokens = (
      focusStable
        ? tokens.filter((t) => `${t.chainId}:${t.tokenAddress.toLowerCase()}` !== key)
        : [fresh, ...tokens.filter((t) => `${t.chainId}:${t.tokenAddress.toLowerCase()}` !== key)]
    ).slice(0, limit);
  }

  if (tokens.length === 0) {
    throw new Error("No tradable tokens for alpha scan. Check DexScreener connection.");
  }

  tokens = await enrichTokensWithIcons(tokens, Math.min(limit, 10));

  const { buildAlphaIntelReport } = await import("./alpha-intel");
  const { buildAlphaDeskIntel, EMPTY_ALPHA_COMMUNITY } = await import("./alpha-desk-scan");
  const { getApeWisdomMentionMap, lookupApeWisdom } = await import("./apewisdom");
  const { scanConcurrencyFor } = await import("./birdeye-policy");
  const macro = await getMacroRegime();
  const apeMap = await getApeWisdomMentionMap("all-crypto", 1).catch(
    () => new Map() as Awaited<ReturnType<typeof getApeWisdomMentionMap>>,
  );

  const deskRows = await mapWithConcurrencySafe(
    tokens,
    async (token, index) => {
      const fresh = index < 4 ? await refreshTokenFromDex(token) : token;
      const desk = await buildAlphaDeskIntel(fresh, index);
      const { scoreTokenSecurity } = await import("./token-security");
      let security = scoreTokenSecurity(desk.token, desk.intel);
      if (desk.gmgnSecurity) {
        const { mergeGmgnIntoSecurityReport } = await import("./gmgn-enrichment");
        security = mergeGmgnIntoSecurityReport(security, desk.gmgnSecurity);
      }
      const scam = assessTokenScam(desk.token, desk.intel, security);
      let signal = heuristicDecision(desk.token, desk.intel, macro, { security, scam });
      signal = enforceSignalGate(desk.token, desk.intel, signal, { macro, security, scam });
      signal = applyScamAndSecurity(desk.token, desk.intel, signal, security, scam);
      return { ...desk, security, scam, signal };
    },
    scanConcurrencyFor("alpha", 4),
    "alpha-desk",
  );

  if (deskRows.length === 0) {
    throw new Error("Alpha desk pass failed — Dex/GMGN may be slow. Retry in a moment.");
  }

  const opportunities: AlphaOpportunity[] = await Promise.all(
    deskRows.map(async (row) => {
    const { token, intel, signal, security, gmgnLines } = row;
    const key = `${token.chainId}:${token.tokenAddress.toLowerCase()}`;
    const sourceTags = candidateMap.get(key)?.sourceTags ?? [];
    const gmgnExtra = gmgnLines?.length ? gmgnLines.join(" · ") : undefined;
    const gmgnTagBoost = sourceTags.some((t) => /signal|trending/i.test(t)) ? 8 : 0;
    const report = await buildAlphaIntelReport({
      token,
      intel,
      signal,
      news: [],
      community: EMPTY_ALPHA_COMMUNITY,
      geckoTrending: geckoHot.has(key),
      gmgnLine: gmgnExtra,
      security,
      skipGithub: true,
      sourceTags,
    });
    const apeRow = lookupApeWisdom(token.symbol, apeMap);
    let legacyScore =
      scoreOpportunity(token, signal, intel, undefined, 0) +
      (geckoHot.has(key) ? 5 : 0) +
      gmgnTagBoost;
    if (apeRow) legacyScore += Math.min(18, 8 + Math.min(10, apeRow.mentions));

    return {
      rank: 0,
      symbol: token.symbol,
      name: token.name,
      tokenAddress: token.tokenAddress,
      chainId: token.chainId,
      priceUsd: token.priceUsd,
      change24h: token.change24h,
      action: signal.action,
      confidence: signal.confidence,
      opportunityScore: Math.round((legacyScore + report.alphaScore) / 2),
      alphaScore: report.alphaScore,
      narrativeAcceleration: report.narrativeAcceleration,
      narrativeSummary: report.narrativeSummary,
      smartMoneySignal: report.smartMoneySignal,
      momentumHealth: report.momentumHealth,
      riskScore: report.riskScore,
      riskBreakdown: report.riskBreakdown,
      aiThesis: report.aiThesis,
      ecosystemTags: report.ecosystemTags,
      reasoning: signal.reasoning,
      whyAction: signal.whyAction,
      newsHeadlines: [] as string[],
      socialBuzz: gmgnExtra,
      apeWisdomRank: apeRow?.rank,
      apeMentions: apeRow?.mentions,
      galaxyScore: intel.social?.lunarcrush?.galaxyScore,
      icon: token.icon,
      liquidityUsd: token.liquidityUsd,
      volume24h: token.volume24h,
      sourceTags,
      marketSentiment: scanIntel.marketSentiment.publicSummary,
      sentimentScore: scanIntel.marketSentiment.score,
      researchGlance: signal.whyAction.slice(0, 200),
      reasoningFactors: signal.reasoningFactors,
    };
    }),
  );

  if (opportunities.length === 0) {
    throw new Error("Alpha ranking failed — could not build reports. Retry in a moment.");
  }

  const ranked = opportunities.filter(
    (o) =>
      !isStablecoin(o.symbol, o.name, {
        tokenAddress: o.tokenAddress,
        chainId: o.chainId,
        priceUsd: o.priceUsd,
        change24h: o.change24h,
      }),
  );
  opportunities.length = 0;
  opportunities.push(...ranked);

  if (opportunities.length === 0) {
    throw new Error("Alpha scan found only stablecoins — no tradable alts. Retry shortly.");
  }

  const { edgeFromReasoningFactors } = await import("./nexus-token-narrative");
  opportunities.sort((a, b) => {
    const rank = (o: AlphaOpportunity) => {
      const edge = edgeFromReasoningFactors(o.reasoningFactors);
      const buyBoost = o.action === "BUY" ? 1500 : o.action === "SELL" ? -500 : 0;
      const hypePenalty = o.change24h > 200 ? -80 : o.change24h > 120 ? -30 : 0;
      const liqBoost = (o.liquidityUsd ?? 0) >= 55_000 ? 25 : 0;
      return buyBoost + edge * 4 + o.alphaScore + o.confidence + liqBoost + hypePenalty;
    };
    return rank(b) - rank(a) || b.opportunityScore - a.opportunityScore;
  });
  opportunities.forEach((row, i) => {
    row.rank = i + 1;
  });

  const buyCount = opportunities.filter((o) => o.action === "BUY").length;
  const sellCount = opportunities.filter((o) => o.action === "SELL").length;
  const holdCount = opportunities.length - buyCount - sellCount;
  const { computeMarketSentiment } = await import("./alpha-scan-engine");
  scanIntel.marketSentiment = computeMarketSentiment({
    monitorSources: scanIntel.monitorSources,
    discoverySources: scanIntel.discoverySources,
    signalHits: scanIntel.signalHits,
    buyCount,
    holdCount,
    sellCount,
  });

  return {
    opportunities,
    count: opportunities.length,
    scanMode: "alpha" as const,
    criteria:
      "alpha-unified|gmgn-discovery|gmgn-monitor|gmgn-security|6551-opennews|6551-twitter|apewisdom|reddit|hn|perception|gecko|birdeye|ai-thesis",
    topBuys: opportunities.filter((o) => o.action === "BUY").slice(0, 10),
    scanIntel,
  };
}

export async function runNexusDecisionForSymbol(
  symbol: string,
  preferredChain?: string,
  arcFeeTxHash?: string,
) {
  const tokens = await fetchSwappableTokens(24, preferredChain);
  const token =
    tokens.find((item) => item.symbol.toLowerCase() === symbol.toLowerCase()) ?? tokens[0];
  if (!token) {
    throw new Error("No swappable tokens available for your wallet chain");
  }

  const decision = await buildDecision(token, arcFeeTxHash);
  await addNexusDecision(decision);
  return decision;
}

export async function getTokenDecision(chainId: string, tokenAddress: string) {
  const { fetchTokenPair } = await import("./dexscreener");
  const token = await fetchTokenPair(chainId, tokenAddress);
  if (!token) throw new Error("Token not found");
  return buildDecision(token);
}

export type { AgentSignal } from "./storage";

export async function analyzeTokenSignal(
  token: TrendingToken,
  intel?: TokenIntel,
  deep = false,
): Promise<AgentSignal> {
  const enriched = intel ?? (await enrichToken(token));
  const { scoreTokenSecurity } = await import("./token-security");
  const security = scoreTokenSecurity(token, enriched);
  const scam = assessTokenScam(token, enriched, security);
  const raw = deep ? await aiDecision(token, enriched) : heuristicDecision(token, enriched);
  return applyScamAndSecurity(token, enriched, raw, security, scam);
}

/** Live Feed / Alpha desk signal — macro regime + signal gate + security (matches feed badges). */
export async function buildDeskAgentSignal(
  token: TrendingToken,
  intel: TokenIntel,
): Promise<AgentSignal> {
  const { scoreTokenSecurity } = await import("./token-security");
  const security = scoreTokenSecurity(token, intel);
  const scam = assessTokenScam(token, intel, security);
  const macro = await getMacroRegime();
  let signal = heuristicDecision(token, intel, macro, { security, scam });
  signal = enforceSignalGate(token, intel, signal, { macro, security, scam });
  return applyScamAndSecurity(token, intel, signal, security, scam);
}

async function aiFeedBatch(
  batch: { token: TrendingToken; intel: TokenIntel }[],
): Promise<Map<string, AgentSignal>> {
  const out = new Map<string, AgentSignal>();
  const client = getAiClient();
  if (!client || batch.length === 0) return out;

  const payload = batch.map(({ token, intel }) => ({
    symbol: token.symbol,
    chainId: token.chainId,
    priceUsd: token.priceUsd,
    change24h: token.change24h,
    volume24h: token.volume24h,
    liquidityUsd: token.liquidityUsd,
    marketCap: token.marketCap ?? intel.marketCap,
    fdv: token.fdv,
    buys: token.txns24h?.buys,
    sells: token.txns24h?.sells,
    rsi: intel.technical?.rsi,
    macd: intel.technical?.macdSignal,
    trend: intel.technical?.trendLine,
    taScore: intel.technical?.score,
  }));

  try {
    const completion = await client.chat.completions.create({
      model: getAiModel(),
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${NEXUS_SIGNAL_GATE_PROMPT} Batch: return JSON { signals: [{ symbol, action, confidence, riskScore, reasoning, whyAction }] } — one row per symbol.`,
        },
        { role: "user", content: JSON.stringify(payload) },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      signals?: Array<{
        symbol?: string;
        action?: NexusDecision["action"];
        confidence?: number;
        riskScore?: number;
        reasoning?: string;
        whyAction?: string;
      }>;
    };
    for (const row of parsed.signals ?? []) {
      if (!row.symbol) continue;
      const match = batch.find((b) => b.token.symbol.toUpperCase() === row.symbol!.toUpperCase());
      if (!match) continue;
      const factors = buildReasoningFactors(match.token, match.intel, row.action ?? "HOLD");
      const { edge } = scoreFactorEdge(factors);
      const rawSignal = {
        action: row.action ?? "HOLD",
        confidence: normalizePct(row.confidence, 50),
        riskScore: normalizePct(row.riskScore, 50),
        reasoning: row.reasoning ?? "",
        whyAction: row.whyAction ?? buildWhyAction(row.action ?? "HOLD", match.token, factors, edge),
        reasoningFactors: factors,
      };
      out.set(
        match.token.tokenAddress.toLowerCase(),
        enforceSignalGate(match.token, match.intel, rawSignal),
      );
    }
  } catch (e) {
    console.warn("Feed batch AI failed:", e);
  }
  return out;
}

async function feedTokenSecurity(
  token: TrendingToken,
  intel: TokenIntel,
  rank: number,
): Promise<import("./token-security").TokenSecurityReport> {
  const { fetchExternalTokenSecurity } = await import("./external-token-security");
  let security = await fetchExternalTokenSecurity(token, intel);
  if (rank >= 6) return security;

  const { hasGmgnApiKey } = await import("./gmgn-client");
  if (!hasGmgnApiKey()) return security;

  const { runGmgnAnalyticsSkill, dexChainIdToGmgn } = await import("./gmgn-analytics");
  const { mergeGmgnIntoSecurityReport } = await import("./gmgn-enrichment");
  const chain = dexChainIdToGmgn(token.chainId);
  if (!chain) return security;

  const gmgnSec = await runGmgnAnalyticsSkill("token-security-check", {
    chain,
    address: token.tokenAddress,
  });
  if (gmgnSec.ok && gmgnSec.data) {
    security = mergeGmgnIntoSecurityReport(security, gmgnSec.data);
  }
  return security;
}

function finalizeFeedSignal(
  token: TrendingToken,
  intel: TokenIntel,
  signal: AgentSignal,
  security: import("./token-security").TokenSecurityReport,
) {
  const scam = assessTokenScam(token, intel, security);
  if (scam.isScam) {
    security.scamRisk = true;
    security.scamLabel = scam.label;
    security.scamType = scam.scamType ?? undefined;
    if (scam.severity >= 50) security.honeypotRisk = true;
  }
  return applyScamAndSecurity(token, intel, signal, security, scam);
}

async function intelForFeedRank(token: TrendingToken, rank: number): Promise<TokenIntel> {
  const base = token.intel ?? buildLocalTokenIntel(token);
  const { getBirdeyePlan } = await import("./birdeye-policy");
  const { fetchMergedTokenDetection } = await import("./token-detection");
  const { fetchHolderCascade } = await import("./holder-fallback");
  const { enrichIntelFromHolders } = await import("./nexus-edge-score");
  const { fetchGoPlusTokenSecurity } = await import("./goplus-security");
  const plan = getBirdeyePlan("feed", rank);
  let intel = base;

  if (rank < 4) {
    const cascade = await Promise.race([
      fetchHolderCascade(token.chainId, token.tokenAddress, {
        birdeyeMode: rank < 2 ? plan.detection : "off",
      }),
      new Promise<Awaited<ReturnType<typeof fetchHolderCascade>>>((resolve) =>
        setTimeout(
          () => resolve({ holders: [], traders: [], source: "birdeye", notes: ["holder budget"] }),
          4_500,
        ),
      ),
    ]);
    if (cascade.holders.length) {
      intel = enrichIntelFromHolders(intel, cascade.holders);
    }
  }
  if (rank < 2) {
    const goplus = await Promise.race([
      fetchGoPlusTokenSecurity(token.chainId, token.tokenAddress),
      new Promise<Awaited<ReturnType<typeof fetchGoPlusTokenSecurity>>>((resolve) =>
        setTimeout(() => resolve({ ok: false, flags: [] }), 3_500),
      ),
    ]);
    if (goplus.holderCount && goplus.holderCount > 0) {
      intel = { ...intel, holderCount: goplus.holderCount };
    }
    if (goplus.top10HolderPercent != null) {
      intel = { ...intel, top10HolderPercent: goplus.top10HolderPercent };
    }
    if (goplus.isMintable != null) intel = { ...intel, isMintable: goplus.isMintable };
  }

  if (plan.detection !== "off" && rank < 4) {
    const det = await fetchMergedTokenDetection(
      token.tokenAddress,
      token.chainId,
      {
        buys: token.txns24h?.buys ?? 0,
        sells: token.txns24h?.sells ?? 0,
        volume: token.volume24h,
      },
      { birdeyeMode: plan.detection },
    );
    const hc = (det.summary as { holderCount?: number }).holderCount;
    if (hc != null && hc > 0) intel = { ...intel, holderCount: hc };
    if (det.summary.buy24h != null) intel = { ...intel, buy24h: det.summary.buy24h };
    if (det.summary.sell24h != null) intel = { ...intel, sell24h: det.summary.sell24h };
  }

  if (rank >= 2) return intel;
  if (!plan.ohlcv) return intel;
  const ta = await resolveTokenTechnical(token, { allowBirdeyeOhlcv: true });
  return { ...intel, technical: technicalToIntel(ta) };
}

export type FeedQuickAnalyzeOptions = {
  birdeyeCap?: number;
  skipGmgnSecurity?: boolean;
  /** Dex + local intel only — no holder/GoPlus/Birdeye (Vercel quick feed). */
  dexOnly?: boolean;
};

/** Fast path: heuristic + security; Birdeye TA on top-volume slice */
export async function analyzeTrendingFeedQuick(
  tokens: TrendingToken[],
  options?: FeedQuickAnalyzeOptions,
) {
  const { scoreDiscoveryHunterToken } = await import("./feed-curation");
  const { mapWithConcurrency } = await import("./async-pool");
  const macro = await getMacroRegime();
  const sorted = [...tokens].sort(
    (a, b) => scoreDiscoveryHunterToken(b) - scoreDiscoveryHunterToken(a),
  );
  const rankOf = new Map(
    sorted.map((t, i) => [`${t.chainId}:${t.tokenAddress.toLowerCase()}`, i]),
  );
  const birdeyeCap = options?.birdeyeCap ?? 3;
  const skipGmgn = options?.skipGmgnSecurity ?? true;
  const dexOnly = options?.dexOnly ?? false;
  return mapWithConcurrency(
    tokens,
    async (token) => {
      const rank = rankOf.get(`${token.chainId}:${token.tokenAddress.toLowerCase()}`) ?? 99;
      const intel = dexOnly
        ? (token.intel ?? buildLocalTokenIntel(token))
        : rank < birdeyeCap
          ? await intelForFeedRank(token, rank)
          : (token.intel ?? buildLocalTokenIntel(token));
      const { scoreTokenSecurity } = await import("./token-security");
      const security = dexOnly
        ? scoreTokenSecurity(token, intel)
        : rank < 3 && !skipGmgn
          ? await feedTokenSecurity(token, intel, rank)
          : rank < 3
            ? await Promise.race([
                (await import("./external-token-security")).fetchExternalTokenSecurity(
                  token,
                  intel,
                ),
                new Promise<Awaited<ReturnType<typeof import("./token-security").scoreTokenSecurity>>>(
                  (resolve) =>
                    setTimeout(
                      () => resolve(scoreTokenSecurity(token, intel)),
                      2_500,
                    ),
                ),
              ])
            : scoreTokenSecurity(token, intel);
      const scam = assessTokenScam(token, intel, security);
      let signal = heuristicDecision(token, intel, macro, { security, scam });
      signal = enforceSignalGate(token, intel, signal, { macro, security, scam });
      signal = finalizeFeedSignal(token, intel, signal, security);
      if (!dexOnly) {
        signal = await applyFeedDeskNarrative(token, intel, signal, security, scam, macro);
      }
      return { token: { ...token, intel }, intel, signal, security };
    },
    dexOnly ? 10 : 4,
  );
}

/** Batch analyze trending tokens — unique scoring + AI on top-volume slice */
export async function analyzeTrendingFeed(tokens: TrendingToken[]) {
  const { scoreTokenSecurity } = await import("./token-security");
  const { scoreDiscoveryHunterToken } = await import("./feed-curation");
  const macro = await getMacroRegime();
  const sorted = [...tokens].sort(
    (a, b) => scoreDiscoveryHunterToken(b) - scoreDiscoveryHunterToken(a),
  );
  const rankOf = new Map(
    sorted.map((t, i) => [`${t.chainId}:${t.tokenAddress.toLowerCase()}`, i]),
  );
  const cycle = Math.floor(Date.now() / 45_000);
  const aiCap = getAiClient() ? 10 : 0;
  const aiMap = new Map<string, AgentSignal>();

  if (aiCap > 0) {
    const pool = sorted.slice(0, 36).map((token) => ({
      token,
      intel: token.intel ?? buildLocalTokenIntel(token),
    }));
    const offset = (cycle % 3) * 6;
    const rotated = [...pool.slice(offset), ...pool.slice(0, offset)].slice(0, aiCap);
    const chunks: (typeof pool)[] = [];
    for (let i = 0; i < rotated.length; i += 6) chunks.push(rotated.slice(i, i + 6));

    const maps = await Promise.all(chunks.map((chunk) => aiFeedBatch(chunk)));
    for (const m of maps) m.forEach((v, k) => aiMap.set(k, v));
  }

  return Promise.all(
    tokens.map(async (token) => {
      const rank = rankOf.get(`${token.chainId}:${token.tokenAddress.toLowerCase()}`) ?? 99;
      const intel = await intelForFeedRank(token, rank);
      const key = token.tokenAddress.toLowerCase();
      const security = await feedTokenSecurity(token, intel, rank);
      const scam = assessTokenScam(token, intel, security);
      let signal = aiMap.get(key) ?? heuristicDecision(token, intel, macro, { security, scam });
      signal = enforceSignalGate(token, intel, signal, { macro, security, scam });
      signal = finalizeFeedSignal(token, intel, signal, security);
      signal = await applyFeedDeskNarrative(token, intel, signal, security, scam, macro);
      return { token: { ...token, intel }, intel, signal, security };
    }),
  );
}
