import { NextRequest, NextResponse } from "next/server";
import { spawnSync } from "child_process";
import { join } from "path";

export const runtime = "nodejs";

/** Fixture or live CMC demo (live when CMC_API_KEY set and ?live=1). */
export async function GET(req: NextRequest) {
  const live = req.nextUrl.searchParams.get("live") === "1";
  const symbol = (req.nextUrl.searchParams.get("symbol") ?? "BNB").toUpperCase();
  const root = process.cwd();
  const script = join(root, "bnb-hack", "backtest", "run.mjs");
  const hasKey = Boolean(process.env.CMC_API_KEY || process.env.CMC_PRO_API_KEY);

  const env = { ...process.env };
  if (!live || !hasKey) {
    env.CMC_API_KEY = "";
    env.CMC_PRO_API_KEY = "";
  }

  const args = [script];
  if (live && hasKey) args.push("--symbol", symbol, "--days", "90");

  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    env,
  });

  if (result.status !== 0) {
    return NextResponse.json(
      { error: result.stderr || "Backtest failed", stdout: result.stdout },
      { status: 500 },
    );
  }

  try {
    const payload = JSON.parse(result.stdout.trim());
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Invalid backtest output", raw: result.stdout }, { status: 500 });
  }
}
