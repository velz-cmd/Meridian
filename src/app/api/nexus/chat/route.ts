import { NextResponse } from "next/server";
import { getAiClient, getAiModel } from "@/lib/ai-client";
import {
  buildNexusChatContextLite,
  formatNexusChatContextForAi,
  sanitizeChatReply,
} from "@/lib/nexus-chat-context";
import { TRADING_SETTLEMENT, TRADING_AUTOPILOT_HINT } from "@/lib/trading-copy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatBody = {
  messages: ChatMessage[];
  token?: {
    symbol?: string;
    chainId: string;
    tokenAddress: string;
  };
  walletConnected?: boolean;
  walletTbnb?: number;
  /** @deprecated use walletTbnb */
  agentBalanceUsdc?: number;
};

const SYSTEM = `You are NEXUS Token Copilot — expert on ONE selected token only. Answer in plain language for beginners.

Your job for this token:
1. Explain fundamentals (liquidity, volume, 24h move, chain) using ONLY the verified live snapshot.
2. Explain technical picture (RSI, MACD, trend) only when those values appear in the snapshot (not n/a).
3. Explain why the AI signal is BUY/SELL/HOLD and what to watch — cite confidence and risk from snapshot.
4. Help with actions on ${TRADING_SETTLEMENT.chainLabel}: buy with tBNB, sell tokens back to tBNB, swap desk tokens (BNB/CAKE/BUSD/USDC), or recurring autopilot. ${TRADING_AUTOPILOT_HINT}

Rules:
- Only discuss the selected token unless user asks general crypto questions.
- Never guarantee profits. Mention risks clearly.
- If security grade is C/D/F or honeypot flags appear, warn strongly before any buy.
- Be specific: cite numbers from the VERIFIED LIVE SNAPSHOT only.
- If data is missing, say "not available in live feed" — NEVER invent prices, holder addresses, whale names, or TA values.
- Do NOT mention charts, chart links, DexScreener embeds, TradingView, or tell the user to "open the chart". Intel is text-only in chat.
- 3-6 sentences unless user asks for short answer.
- Never mention agent vault or USDC for trading — settlement is wallet tBNB on BSC Testnet via PancakeSwap.

Optional action (one per reply):
- buy: { "type":"buy", "usdAmount": number } — USD notional converted to tBNB in the Trade tab
- sell: { "type":"sell" }
- autopilot: { "type":"autopilot", "interval":"15m", "mode":"follow_agent" }

JSON only:
{ "reply": "string", "action": null | object }`;

function heuristicReply(
  ctx: Awaited<ReturnType<typeof buildNexusChatContextLite>>,
  lastUser: string,
): string {
  if (!ctx) return "Token not found on DexScreener — pick another from the live feed.";
  const t = ctx.token;
  const a = ctx.agent;
  return `${t.symbol} is $${t.priceUsd.toFixed(t.priceUsd < 1 ? 6 : 4)} (${t.change24h >= 0 ? "+" : ""}${t.change24h.toFixed(2)}% 24h). Liquidity $${Math.round(t.liquidityUsd).toLocaleString()}, vol $${Math.round(t.volume24h).toLocaleString()}. Signal: ${a.action} at ${a.confidence}% confidence, risk ${a.riskScore}/100. ${a.whyAction ?? ""} You asked: "${lastUser.slice(0, 80)}". Use Buy/Sell tabs — fund wallet with tBNB on BSC Testnet, then sign PancakeSwap txs.`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatBody;
    const messages = body.messages ?? [];
    if (messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    const t = body.token;
    if (!t?.chainId || !t?.tokenAddress) {
      return NextResponse.json({ error: "token chainId and tokenAddress required" }, { status: 400 });
    }

    const ctx = await buildNexusChatContextLite(t.chainId, t.tokenAddress);
    const context = ctx ? formatNexusChatContextForAi(ctx) : "Token not found — do not invent data.";
    const walletTbnb = body.walletTbnb ?? 0;
    const walletCtx = body.walletConnected
      ? `Wallet connected on ${TRADING_SETTLEMENT.chainLabel}. Balance: ${walletTbnb.toFixed(4)} tBNB. Trades debit wallet tBNB via PancakeSwap — not a custodial vault.`
      : `Wallet not connected — user must connect on ${TRADING_SETTLEMENT.chainLabel} before trading.`;

    const client = getAiClient();
    const last = messages[messages.length - 1]?.content ?? "";

    if (!client) {
      return NextResponse.json({
        reply: sanitizeChatReply(heuristicReply(ctx, last)),
        action: null,
        provider: "heuristic",
        refreshedAt: ctx?.refreshedAt,
      });
    }

    const completion = await client.chat.completions.create({
      model: getAiModel(),
      messages: [
        { role: "system", content: SYSTEM },
        { role: "system", content: `${walletCtx}\n\nVERIFIED LIVE SNAPSHOT:\n${context}` },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      response_format: { type: "json_object" },
      temperature: 0.35,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { reply?: string; action?: unknown } = {};
    try {
      parsed = JSON.parse(raw) as { reply?: string; action?: unknown };
    } catch {
      parsed = { reply: raw };
    }

    const action = parsed.action as Record<string, unknown> | null;
    if (action?.type === "buy" && action.usdcAmount != null && action.usdAmount == null) {
      action.usdAmount = action.usdcAmount;
    }

    return NextResponse.json({
      reply: sanitizeChatReply(parsed.reply ?? "I couldn't parse that — try again."),
      action: action ?? null,
      provider: "ai",
      refreshedAt: ctx?.refreshedAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Chat failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
