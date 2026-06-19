import { NextResponse } from "next/server";
import { isOpsAuthorized } from "@/lib/ops-auth";
import { getArcStatus, arcTestnet, ARC_TESTNET_ID } from "@/lib/arc";
import { getCircleStatus } from "@/lib/circle";
import { isSupabaseConfigured } from "@/lib/supabase";
import { probeSupabaseTables } from "@/lib/supabase-health";
import { hasBirdeyeKey, probeBirdeyeHealth } from "@/lib/birdeye-client";
import { probeLunarCrush, hasLunarCrushKey } from "@/lib/lunarcrush";
import { probeNeynar, hasNeynarKey } from "@/lib/neynar";
import { probeReddit, hasRedditCredentials } from "@/lib/reddit";
import { usePremiumSocialApis } from "@/lib/social-config";
import { probeGeckoTerminal } from "@/lib/geckoterminal";
import { hasMoralisKey, probeMoralis } from "@/lib/moralis";
import { hasEtherscanKey, probeEtherscan } from "@/lib/etherscan";
import { hasGithubToken, probeGithub } from "@/lib/github-dev";
import { hasTelegramBotToken, probeTelegram } from "@/lib/telegram-bot";
import { probeDiscord, hasDiscordBotToken, hasDiscordOAuthClient } from "@/lib/discord-bot";
import { hasStocktwitsCredentials, probeStocktwits } from "@/lib/stocktwits";
import { hasRapidApiTwitter, probeRapidApiTwitter } from "@/lib/rapidapi-twitter";
import { hasSocialDataKey, probeSocialData } from "@/lib/social-data-api";
import { probeRedditPublic } from "@/lib/reddit-public";
import { probeApeWisdom } from "@/lib/apewisdom";
import { probeHackerNews } from "@/lib/hackernews";
import { hasPerceptionKey, probePerception } from "@/lib/perception";
import { hasGmgnApiKey, hasGmgnPrivateKey, probeGmgn } from "@/lib/gmgn-client";
import { probeGmgnAnalyticsSkills } from "@/lib/gmgn-discovery";
import { probeGmgnMonitorSkills } from "@/lib/gmgn-monitor";
import { hasOpenNewsToken, probeOpenNews } from "@/lib/opennews-6551";
import { hasOpenTwitterToken, probeOpenTwitter } from "@/lib/opentwitter-6551";
import { probeWithTimeout } from "@/lib/probe-timeout";
import { getGmgnBanStatus } from "@/lib/gmgn-rate-budget";
import { hasOpenRouterKey } from "@/lib/ai-client";
import { probeBinanceMarket } from "@/lib/binance-market";
import { probeDefiLlama } from "@/lib/defillama-client";
import { probeFred, hasFredKey } from "@/lib/fred-client";
import { probeEventRegistry, hasEventRegistryKey } from "@/lib/eventregistry-client";
import { probeDune, hasDuneKey } from "@/lib/dune-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const T = {
  fast: 6_000,
  social: 8_000,
  gmgn: 14_000,
  birdeye: 10_000,
  supabase: 8_000,
} as const;

type OptionalStatusProbes = {
  lunarcrushProbe: Awaited<ReturnType<typeof probeLunarCrush>> | { ok: false; configured: boolean; skipped?: boolean; error?: string };
  neynarProbe: Awaited<ReturnType<typeof probeNeynar>> | { ok: false; configured: boolean; skipped?: boolean; error?: string };
  redditProbe: Awaited<ReturnType<typeof probeReddit>>;
  moralisProbe: { ok: boolean; error?: string };
  etherscanProbe: { ok: boolean; error?: string };
  githubProbe: { ok: boolean; error?: string };
  telegramProbe: { ok: boolean; configured: boolean; error?: string };
  discordProbe: { ok: boolean; configured: boolean; error?: string };
  stocktwitsProbe: { ok: boolean; configured: boolean; error?: string };
  rapidTwitterProbe: { ok: boolean; configured: boolean; error?: string };
  socialDataProbe: { ok: boolean; configured: boolean; error?: string };
  redditPublicProbe: Awaited<ReturnType<typeof probeRedditPublic>>;
  apeWisdomProbe: { ok: boolean; error?: string };
  hackerNewsProbe: { ok: boolean; error?: string };
  perceptionProbe: { ok: boolean; configured: boolean; error?: string };
};

export async function GET(request: Request) {
  if (!isOpsAuthorized(request)) {
    return NextResponse.json(
      {
        product: "MERIDIAN",
        public: true,
        nexus: "/nexus",
        constitution: "/api/constitution/status",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const quick =
    new URL(request.url).searchParams.get("quick") === "1" ||
    process.env.STATUS_QUICK_DEFAULT?.trim() === "true";

  const premiumSocial = usePremiumSocialApis();
  const gmgnBan = getGmgnBanStatus();

  const [
    arc,
    circle,
    supabaseHealth,
    geckoProbe,
    gmgnProbe,
    opennewsProbe,
    opentwitterProbe,
  ] = await Promise.all([
    probeWithTimeout(
      () => getArcStatus(),
      T.fast,
      {
        connected: false,
        chainId: ARC_TESTNET_ID,
        blockNumber: 0,
        rpcUrl: arcTestnet.rpcUrls.default.http[0],
        feeCurrency: "USDC",
        estimatedFeeUsd: 0.01,
        network: "Arc Testnet",
        error: "arc probe timeout",
      } as Awaited<ReturnType<typeof getArcStatus>>,
    ),
    probeWithTimeout(() => getCircleStatus(), T.fast, {
      configured: false,
      walletSetConfigured: false,
      entitySecretConfigured: false,
      kitKeyPresent: false,
      baseUrl: process.env.CIRCLE_API_BASE ?? "https://api-sandbox.circle.com/v1/w3s",
      network: "Arc Testnet / Sandbox",
    }),
    probeWithTimeout(
      () => probeSupabaseTables(),
      T.supabase,
      {
        configured: false,
        tables: [],
        allTablesOk: false,
        demoPortfolio: { configured: false, tableOk: false },
      },
      "supabase",
    ),
    probeWithTimeout(() => probeGeckoTerminal(), T.fast, { ok: false, error: "timeout" }),
    hasGmgnApiKey()
      ? quick
        ? Promise.resolve({
            ok: true,
            configured: true,
            error: gmgnBan.banned
              ? "GMGN cooldown — Live Feed uses Dex + cache"
              : "Keys set — full GMGN probe on Recheck (skipped in quick status)",
          })
        : probeWithTimeout(() => probeGmgn(), T.gmgn, {
            ok: false,
            configured: true,
            error: "GMGN slow or rate-limited — Live Feed still runs on Dex",
          })
      : Promise.resolve({ ok: false, configured: false, error: "GMGN_API_KEY not set" }),
    hasOpenNewsToken()
      ? probeWithTimeout(() => probeOpenNews(), T.social, { ok: false, configured: true, error: "timeout" })
      : Promise.resolve({ ok: false, configured: false }),
    hasOpenTwitterToken()
      ? probeWithTimeout(() => probeOpenTwitter(), T.social, { ok: false, configured: true, error: "timeout" })
      : Promise.resolve({ ok: false, configured: false }),
  ]);

  const gmgnAnalyticsProbe = quick
    ? {
        ok: Boolean(gmgnProbe.ok),
        skills: {
          _mode: {
            ok: true,
            note: gmgnBan.banned
              ? "GMGN cooldown — use Live Feed cached reads"
              : "quick status — full skill matrix skipped",
          },
        },
      }
    : hasGmgnApiKey()
      ? await probeWithTimeout(
          () => probeGmgnAnalyticsSkills("sol"),
          T.gmgn,
          { ok: false, skills: { _mode: { ok: false, error: "analytics probe timeout" } } },
        )
      : { ok: false, skills: {} };

  const gmgnMonitorProbe = quick
    ? {
        ok: Boolean(gmgnProbe.ok),
        skills: {
          _mode: { ok: true, note: "quick status — monitor skills skipped" },
        },
      }
    : hasGmgnApiKey()
      ? await probeWithTimeout(
          () => probeGmgnMonitorSkills("sol"),
          T.gmgn,
          { ok: false, skills: { _mode: { ok: false, error: "monitor probe timeout" } } },
        )
      : { ok: false, skills: {} };

  let birdeyeProbe: { ok: boolean; error?: string } = { ok: false, error: "no key" };
  if (hasBirdeyeKey() && !quick) {
    birdeyeProbe = await probeWithTimeout(
      () => probeBirdeyeHealth(),
      T.birdeye,
      { ok: false, error: "birdeye probe timeout" },
    );
  } else if (hasBirdeyeKey()) {
    birdeyeProbe = { ok: true };
  }

  const optional: Partial<OptionalStatusProbes> = quick
    ? {}
    : await (async (): Promise<OptionalStatusProbes> => {
        const [
          lunarcrushProbe,
          neynarProbe,
          redditProbe,
          moralisProbe,
          etherscanProbe,
          githubProbe,
          telegramProbe,
          discordProbe,
          stocktwitsProbe,
          rapidTwitterProbe,
          socialDataProbe,
          redditPublicProbe,
          apeWisdomProbe,
          hackerNewsProbe,
          perceptionProbe,
        ] = await Promise.all([
          premiumSocial && hasLunarCrushKey()
            ? probeWithTimeout(
                () => probeLunarCrush(),
                T.social,
                { ok: false, configured: true, error: "timeout" },
              )
            : Promise.resolve({
                ok: false,
                configured: hasLunarCrushKey(),
                skipped: true,
                error: "free mode",
              }),
          premiumSocial && hasNeynarKey()
            ? probeWithTimeout(() => probeNeynar(), T.social, { ok: false, configured: true, error: "timeout" })
            : Promise.resolve({ ok: false, configured: hasNeynarKey(), skipped: true, error: "free mode" }),
          probeWithTimeout(() => probeReddit(), T.social, {
            ok: false,
            configured: hasRedditCredentials(),
            error: "timeout",
          }),
          hasMoralisKey()
            ? probeWithTimeout(() => probeMoralis(), T.fast, { ok: false, error: "timeout" })
            : Promise.resolve({ ok: false, error: "not configured" }),
          hasEtherscanKey()
            ? probeWithTimeout(() => probeEtherscan(), T.fast, { ok: false, error: "timeout" })
            : Promise.resolve({ ok: false, error: "not configured" }),
          probeWithTimeout(() => probeGithub(), T.fast, { ok: false, error: "timeout" }),
          hasTelegramBotToken()
            ? probeWithTimeout(() => probeTelegram(), T.fast, { ok: false, configured: true, error: "timeout" })
            : Promise.resolve({ ok: false, configured: false, error: "not configured" }),
          probeWithTimeout(() => probeDiscord(), T.fast, {
            ok: false,
            configured: hasDiscordBotToken(),
            error: "timeout",
          }),
          hasStocktwitsCredentials()
            ? probeWithTimeout(() => probeStocktwits(), T.social, { ok: false, configured: true, error: "timeout" })
            : Promise.resolve({ ok: false, configured: false, error: "not configured" }),
          hasRapidApiTwitter()
            ? probeWithTimeout(() => probeRapidApiTwitter(), T.social, { ok: false, configured: true, error: "timeout" })
            : Promise.resolve({ ok: false, configured: false, error: "not configured" }),
          hasSocialDataKey()
            ? probeWithTimeout(() => probeSocialData(), T.social, { ok: false, configured: true, error: "timeout" })
            : Promise.resolve({ ok: false, configured: false, error: "not configured" }),
          probeWithTimeout(() => probeRedditPublic(), T.fast, {
            ok: false,
            configured: true,
            error: "timeout",
          }),
          probeWithTimeout(() => probeApeWisdom(), T.fast, { ok: false, error: "timeout" }),
          probeWithTimeout(() => probeHackerNews(), T.fast, { ok: false, error: "timeout" }),
          hasPerceptionKey()
            ? probeWithTimeout(() => probePerception(), T.social, { ok: false, configured: true, error: "timeout" })
            : Promise.resolve({ ok: false, configured: false, error: "not configured" }),
        ]);
        return {
          lunarcrushProbe,
          neynarProbe,
          redditProbe,
          moralisProbe,
          etherscanProbe,
          githubProbe,
          telegramProbe,
          discordProbe,
          stocktwitsProbe,
          rapidTwitterProbe,
          socialDataProbe,
          redditPublicProbe,
          apeWisdomProbe,
          hackerNewsProbe,
          perceptionProbe,
        };
      })();

  const redditProbe = optional.redditProbe ?? {
    ok: false,
    configured: hasRedditCredentials(),
  };
  const redditPublicProbe = optional.redditPublicProbe ?? { ok: false, configured: false };
  const redditEffective =
    redditProbe.ok || redditPublicProbe.ok
      ? { ok: true, oauth: redditProbe.ok, public: redditPublicProbe.ok }
      : {
          ok: false,
          oauth: redditProbe.configured ?? hasRedditCredentials(),
          public: redditPublicProbe.configured ?? false,
          error: redditProbe.error ?? redditPublicProbe.error,
        };

  return NextResponse.json(
    {
      arc,
      circle,
      supabase: isSupabaseConfigured(),
      supabaseTables: supabaseHealth.tables,
      supabaseAllTablesOk: supabaseHealth.allTablesOk,
      demoPortfolio: supabaseHealth.demoPortfolio,
      birdeye: hasBirdeyeKey(),
      birdeyeProbe,
      zeroX: Boolean(process.env.ZEROX_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
      arcRpc: Boolean(process.env.NEXT_PUBLIC_ARC_RPC_URL?.trim()),
      newsapi: Boolean(process.env.NEWS_API_KEY?.trim()),
      coingecko: Boolean(process.env.COINGECKO_API_KEY?.trim()),
      groq: Boolean(process.env.GROQ_API_KEY?.trim()),
      dexpaprika: true,
      cryptoNews: true,
      lunarcrush: hasLunarCrushKey(),
      lunarcrushProbe: optional.lunarcrushProbe ?? { ok: false, configured: hasLunarCrushKey(), skipped: true },
      neynar: hasNeynarKey(),
      neynarProbe: {
        ...(optional.neynarProbe ?? { ok: false, configured: hasNeynarKey() }),
        searchEnabled: process.env.NEYNAR_USE_SEARCH?.trim().toLowerCase() === "true",
      },
      reddit: hasRedditCredentials() || redditPublicProbe.ok,
      redditProbe: redditEffective,
      redditPublicProbe,
      apeWisdomProbe: optional.apeWisdomProbe ?? { ok: true },
      hackerNewsProbe: optional.hackerNewsProbe ?? { ok: true },
      perception: hasPerceptionKey(),
      perceptionProbe: optional.perceptionProbe ?? { ok: false, configured: hasPerceptionKey() },
      gmgn: hasGmgnApiKey(),
      gmgnPrivateKey: hasGmgnPrivateKey(),
      gmgnProbe,
      gmgnAnalyticsProbe,
      gmgnMonitorProbe,
      gmgnBan,
      opennews: hasOpenNewsToken(),
      opennewsProbe,
      opentwitter: hasOpenTwitterToken(),
      opentwitterProbe,
      socialStack: premiumSocial ? "premium" : "free",
      geckoterminal: true,
      geckoProbe,
      moralis: hasMoralisKey(),
      moralisProbe: optional.moralisProbe ?? { ok: false, error: "not configured" },
      etherscan: hasEtherscanKey(),
      etherscanProbe: optional.etherscanProbe ?? { ok: false, error: "not configured" },
      github: hasGithubToken(),
      githubProbe: optional.githubProbe ?? { ok: true },
      telegram: hasTelegramBotToken(),
      telegramProbe: optional.telegramProbe ?? { ok: false, configured: false },
      discordBot: hasDiscordBotToken(),
      discordOAuth: hasDiscordOAuthClient(),
      discordProbe: optional.discordProbe ?? { ok: false, configured: hasDiscordBotToken() },
      stocktwits: hasStocktwitsCredentials(),
      stocktwitsProbe: optional.stocktwitsProbe ?? { ok: false, configured: false },
      rapidApiTwitter: hasRapidApiTwitter(),
      rapidTwitterProbe: optional.rapidTwitterProbe ?? { ok: false, configured: false },
      socialData: hasSocialDataKey(),
      socialDataProbe: optional.socialDataProbe ?? { ok: false, configured: false },
      statusMode: quick ? "quick" : "full",
      openrouter: hasOpenRouterKey(),
      prismFeeds: quick
        ? {
            binance: { ok: true, note: "public data-api.binance.vision" },
            defillama: { ok: true, note: "public api.llama.fi" },
            fred: { ok: hasFredKey(), configured: hasFredKey() },
            eventRegistry: { ok: hasEventRegistryKey(), configured: hasEventRegistryKey() },
            dune: { ok: hasDuneKey(), configured: hasDuneKey() },
          }
        : {
            binance: await probeWithTimeout(() => probeBinanceMarket(), T.fast, { ok: false }),
            defillama: await probeWithTimeout(() => probeDefiLlama(), T.fast, { ok: false }),
            fred: await probeWithTimeout(() => probeFred(), T.social, {
              ok: false,
              configured: hasFredKey(),
            }),
            eventRegistry: await probeWithTimeout(() => probeEventRegistry(), T.social, {
              ok: false,
              configured: hasEventRegistryKey(),
            }),
            dune: await probeWithTimeout(() => probeDune(), T.social, {
              ok: false,
              configured: hasDuneKey(),
              queryConfigured: false,
              dashboardUrl: null,
            }),
          },
      alphaLayers:
        "gmgn|apewisdom|reddit-public|hackernews|perception|narrative|telegram|discord|github|on-chain|binance|defillama|fred|dune",
      mode:
        process.env.GROQ_API_KEY ||
        process.env.OPENROUTER_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.ANTHROPIC_API_KEY
          ? "ai"
          : "heuristic",
      aiProvider: process.env.GROQ_API_KEY
        ? "groq"
        : process.env.OPENROUTER_API_KEY
          ? "openrouter"
          : process.env.OPENAI_API_KEY
            ? "openai"
            : process.env.ANTHROPIC_API_KEY
              ? "anthropic"
              : "heuristic",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
