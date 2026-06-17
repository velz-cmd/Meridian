import { NextResponse } from "next/server";
import { GMGN_AUTONOMOUS_STACK } from "@/lib/gmgn-recommended";
import { fetchGmgnSkillsCatalog, getGmgnSkillById } from "@/lib/gmgn-skills";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await fetchGmgnSkillsCatalog();
  const stack = GMGN_AUTONOMOUS_STACK.map((tier) => ({
    ...tier,
    skills: tier.skillIds
      .map((id) => getGmgnSkillById(catalog, id))
      .filter((s): s is NonNullable<typeof s> => s != null),
  }));

  return NextResponse.json({
    note: "Install one skill at a time in NEXUS after review. Start with tier brain (read-only).",
    stack,
    minimalInstall: ["gmgn-market", "gmgn-token", "gmgn-track"],
    executionNote:
      "Autopilot uses demo trades on BSC Testnet (tBNB). GMGN trading skills execute on Sol/BSC/Base with real funds.",
  });
}
