/** MERIDIAN — product identity for user-facing surfaces. */

export const MERIDIAN_NAME = "MERIDIAN";
export const MERIDIAN_TAGLINE = "Market intelligence";

/** Canonical production URL — used for judge-facing reproduce commands. */
export const MERIDIAN_PROD_URL = "https://trader-arc.vercel.app";
export const MERIDIAN_MODULES = "Strategy · NEXUS · PRISM";
export const MERIDIAN_BUILT_FOR = "Live data · Auditable rules · Testnet execution";

/** Secondary modules — kept accessible, not the lead identity. */
export const MERIDIAN_MODULES_FULL = "NEXUS terminal + PRISM oracle";

export const MERIDIAN_FOOTER_LINE = MERIDIAN_MODULES;

export const MERIDIAN_HOME_HEADLINE = "Turn market data into backtestable strategy.";
export const MERIDIAN_HOME_SUBLINE =
  "Live market data, explainable rules, and permit-gated execution — one desk from research to settlement.";

export const MERIDIAN_PAGE_TITLE = `${MERIDIAN_NAME} | ${MERIDIAN_HOME_HEADLINE.replace(/\.$/, "")}`;
export const MERIDIAN_META_DESCRIPTION =
  "MERIDIAN turns live market data into auditable strategy rules, constitution permits, historical replay, and testnet execution.";
