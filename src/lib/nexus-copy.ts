/** User-facing NEXUS copy — no vendor / pipeline names */

export const NEXUS_TAGLINE =
  "We read the market so you don't have to stare at 50 columns like a pro terminal.";

/** Cycling hero headlines — Alpha Scan / agent research focus */
export const NEXUS_ALPHA_HERO_LINES = [
  "momentum before the crowd",
  "liquidity · sentiment · risk",
  "alpha ranked by your agent",
  "research — not a data wall",
] as const;

export const NEXUS_ALPHA_HERO_SUB =
  "Pro meme-coin research in the background — you get ranked setups and plain verdicts, not a 50-column terminal.";

/** Shown above optional intel panels (under chart) */
export const NEXUS_INTEL_BRIEF =
  "NEXUS is built for pro meme-coin hunters: the agent fuses on-chain flow, holder concentration, multi-timeframe TA, social sweeps, and rug heuristics — then outputs BUY · SELL · HOLD with a written thesis. Expand sections below when you want the full reasoning; the feed and Alpha Scan already run a lighter pass on every token.";

export const NEXUS_AGENT_LAYERS = [
  "On-chain liquidity & 24h buy/sell flow",
  "Multi-timeframe OHLCV · RSI · MACD · MAs",
  "Holder graph & smart-money tags",
  "Social feed & narrative buzz",
  "Concentration & scam checks",
] as const;

/** Pro intel skills surfaced on Alpha deep scan (not generic chat copy). */
export const NEXUS_GMGN_PRO_SKILLS = [
  "Top holders & wallet % supply",
  "Smart-money / KOL tagged wallets",
  "Sniper & insider concentration",
  "Trending + signal discovery feeds",
  "Security & honeypot heuristics",
] as const;

export const NEXUS_VALUE_STEPS = [
  {
    title: "Agent scans",
    detail: "Liquidity, whales, social buzz, scams, momentum — handled in the background.",
  },
  {
    title: "You get a verdict",
    detail: "BUY · SELL · HOLD, risk score, and a plain-English reason — not raw wallet tables.",
  },
  {
    title: "One-tap trade",
    detail: "Buy, sell, swap on BSC Testnet via PancakeSwap — wallet signs every tx.",
  },
] as const;

/** What dense terminals show manually vs what NEXUS automates */
export const NEXUS_AUTOMATES = [
  "Top traders & holder tables",
  "Snipers, insiders, honeypot checks",
  "Social / trench trending",
  "24h flow, MC, liquidity bands",
  "Security badges & rug signals",
] as const;

export const ALPHA_SCAN_LOADING =
  "Pro desk pass — market structure, TA, signals & security. Ranking by liquidity, momentum, holder risk, and entry gate (not AI hype).";

export const ALPHA_SCAN_EMPTY =
  "Run a scan from the hero above — the agent will research dozens of tokens and return a short ranked list.";

export const ALPHA_SCAN_ERROR_TIP =
  "Stay on BSC Testnet, connect your wallet, and try again in a moment.";

export const ALPHA_SCAN_SUCCESS = (count: number, topSymbol?: string, sentiment?: string) =>
  `${count} picks ready${topSymbol ? ` · best: ${topSymbol}` : ""}${sentiment ? ` · ${sentiment}` : ""}`;

export const SAVED_SCANS_LABEL = (n: number, max: number) =>
  n > 0 ? `Saved scans (${Math.min(n, max)} archived)` : "Saved scans";

export function publicSourceLabel(tag: string): string {
  if (/signal/i.test(tag)) return "Live signal";
  if (/trending/i.test(tag)) return "Trending";
  if (/dex|market|screener|paprika|gecko/i.test(tag)) return "Market data";
  if (/birdeye|ohlcv|ta/i.test(tag)) return "Chart data";
  if (/gmgn|holder|wallet|smart/i.test(tag)) return "On-chain";
  if (/6551|news|twitter|social|opennews/i.test(tag)) return "Social feed";
  if (/blockscout|moralis|goplus|bubble/i.test(tag)) return "Holder graph";
  return "Intel";
}

/** Strip vendor names from intel notes shown in dossier UI. */
export function sanitizeIntelNote(note: string): string {
  let s = note
    .replace(/\b(Birdeye|GMGN|6551|DexPaprika|Bubblemaps|Blockscout|Moralis|DexScreener|GoPlus|OpenNews|OpenTwitter|ApeWisdom)\b/gi, "")
    .replace(/API_KEY_6551|OPENNEWS_TOKEN|GMGN_API_KEY|BIRDEYE_API_KEY/gi, "server config")
    .replace(/on Vercel and redeploy/gi, "on server and redeploy")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (/quota|rate.?limit|insufficient/i.test(s)) {
    return "Data feed unavailable — quota limited, retry later";
  }
  if (/no live rows|empty|unavailable|not set|not on server/i.test(s)) {
    return s.replace(/:\s*$/, "") || "Data feed unavailable — retry later";
  }
  if (/Top holders:/i.test(s)) return s.replace(/Top holders:.*/, "Top holders: on-chain graph");
  if (/Top traders:/i.test(s)) return s.replace(/Top traders:.*/, "Top traders: pool flow / smart tags");
  if (/Copy-trade:/i.test(s)) return s.replace(/full GMGN desk/i, "full Alpha desk");
  if (/6551|OpenNews|social/i.test(note)) {
    return openNewsCountFromNote(note);
  }
  return s || "Intel note";
}

function openNewsCountFromNote(note: string): string {
  const m = note.match(/(\d+)\s+headline/);
  if (m) return `Social feed: ${m[1]} headline${Number(m[1]) > 1 ? "s" : ""} matched`;
  if (/configured|connected/i.test(note)) return "Social feed: connected — run Alpha Scan for full pass";
  return "Social feed unavailable — retry later";
}

/** Sanitize source tags for agent reasoning strip. */
export function sanitizeIntelSources(sources: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const src of sources) {
    const label = publicSourceLabel(src);
    if (!seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

export function publicSentimentSummary(label: string, score: number): string {
  const tone =
    label === "Risk-on"
      ? "Risk appetite is elevated — flows favor aggressive setups."
      : label === "Cautiously bullish"
        ? "Conditions lean positive but selective sizing is warranted."
        : label === "Risk-off"
          ? "Defensive tone — favor capital preservation and tighter risk."
          : "Mixed tape — focus on liquidity and clear catalysts.";
  return `${tone} (index ${score}).`;
}

export const FEED_INTEL_LABEL = "Desk scout pass";
export const ALPHA_INTEL_LABEL = "Alpha deep intel";

export const REASONING_HEADLINE =
  "Expand for thesis and signals — stats above are market-verified; agent only cites actionable edges.";

export const LIVE_FEED_INTRO =
  "Discovery hunter — fresh launches & 2x–100x bands. Scout pass: BUY only when liquidity, flow, TA & intraday structure align (most rows WATCH). Alpha Scan = pro desk.";

export const FEED_ROW_HINT =
  "Desk scout: liq · 5m/1h · buy/sell flow · entry gate — BUY rare, WATCH default · Alpha Scan for holder depth";

export const ALPHA_TAB_SUBTITLE =
  "Paid pro desk — unique ranked picks (not your Live Feed list)";

export const ALPHA_LIST_INTRO =
  "Pro meme-coin desk — quantitative pass (flow, TA, security, entry gate). BUY only when checks align; most setups stay WATCH. Not your Live Feed list.";

/** One-line agent verdict for list rows */
export function agentVerdictLine(whyAction?: string, thesis?: string, reasoning?: string): string {
  const line = (whyAction || thesis || reasoning || "").trim();
  if (!line) return "Agent is still gathering context for this token.";
  const first = line.split(/[.!?]\s/)[0] ?? line;
  return first.length > 140 ? `${first.slice(0, 137)}…` : first;
}
