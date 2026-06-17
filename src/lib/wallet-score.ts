import type { DemoPosition } from "./demo-trading";
import type { TokenWhale, TokenIntel } from "./storage";

export type WalletScore = {
  address: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  label: string;
  factors: Array<{ label: string; impact: number; detail: string }>;
};

function gradeFromScore(score: number): WalletScore["grade"] {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

export function scoreConnectedWallet(input: {
  address: string;
  positions?: DemoPosition[];
  onArc?: boolean;
  onBsc?: boolean;
}): WalletScore {
  const factors: WalletScore["factors"] = [];
  let score = 55;

  const onTestnet = input.onBsc ?? input.onArc;
  if (onTestnet) {
    score += 15;
    factors.push({ label: "BSC Testnet", impact: 15, detail: "Connected on BSC Testnet — tBNB-ready" });
  }

  const positions = input.positions ?? [];
  if (positions.length > 0) {
    score += Math.min(10, positions.length * 3);
    factors.push({
      label: "Active trader",
      impact: Math.min(10, positions.length * 3),
      detail: `${positions.length} open demo position(s)`,
    });

    const totalPnl = positions.reduce((sum, p) => {
      const value = p.tokenAmount * p.priceUsd;
      return sum + (value - p.usdcSpent);
    }, 0);
    if (totalPnl > 0) {
      score += 12;
      factors.push({ label: "Profitable", impact: 12, detail: `+$${totalPnl.toFixed(2)} unrealized P&L` });
    } else if (totalPnl < 0) {
      score -= 8;
      factors.push({ label: "Underwater", impact: -8, detail: `$${totalPnl.toFixed(2)} unrealized P&L` });
    }
  } else {
    factors.push({ label: "No positions", impact: 0, detail: "No demo trades yet" });
  }

  score = Math.min(100, Math.max(0, score));
  return {
    address: input.address,
    score,
    grade: gradeFromScore(score),
    label: score >= 70 ? "Smart wallet" : score >= 50 ? "Average wallet" : "High-risk wallet",
    factors,
  };
}

export function scoreTokenWallet(input: {
  address: string;
  whale?: TokenWhale;
  isSniper?: boolean;
  isInsider?: boolean;
  intel?: TokenIntel;
}): WalletScore {
  const factors: WalletScore["factors"] = [];
  let score = 50;

  if (input.whale) {
    const pct = input.whale.pct;
    if (pct > 20) {
      score -= 25;
      factors.push({ label: "Whale concentration", impact: -25, detail: `Holds ${pct.toFixed(1)}% supply` });
    } else if (pct > 5) {
      score += 10;
      factors.push({ label: "Major holder", impact: 10, detail: `Holds ${pct.toFixed(1)}% supply` });
    }
  }

  if (input.isSniper) {
    score -= 30;
    factors.push({ label: "Sniper flagged", impact: -30, detail: "Early buyer / MEV bot pattern" });
  }

  if (input.isInsider) {
    score -= 20;
    factors.push({ label: "Insider wallet", impact: -20, detail: "Large pre-launch allocation suspected" });
  }

  if ((input.intel?.holderCount ?? 0) > 5000) {
    score += 5;
    factors.push({ label: "Distributed token", impact: 5, detail: "Wide holder base" });
  }

  score = Math.min(100, Math.max(0, score));
  return {
    address: input.address,
    score,
    grade: gradeFromScore(score),
    label: input.isSniper ? "Sniper — avoid copy-trading" : input.isInsider ? "Insider — high risk" : "Market participant",
    factors,
  };
}
