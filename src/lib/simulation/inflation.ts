import type { SimulationResult } from "./types";

/**
 * インフレ調整: 名目値を現在の貨幣価値（実質値）に換算する。
 * 実質価値 = 名目価値 ÷ (1 + インフレ率)^経過年数
 * 表示専用の変換で、非課税枠（簿価）は名目のまま扱う。
 */
export function adjustForInflation(
  result: SimulationResult,
  inflationPct: number,
): SimulationResult {
  if (inflationPct <= 0) return result;
  const factor = (year: number) => (1 + inflationPct / 100) ** year;

  const snapshots = result.snapshots.map((s) => ({
    ...s,
    value: Math.round(s.value / factor(s.year)),
    principal: Math.round(s.principal / factor(s.year)),
    gain: Math.round(s.value / factor(s.year) - s.principal / factor(s.year)),
  }));

  const lastYear = result.snapshots.at(-1)?.year ?? 0;
  const finalValue = Math.round(result.finalValue / factor(lastYear));
  const totalPrincipal = Math.round(result.totalPrincipal / factor(lastYear));
  return {
    ...result,
    snapshots,
    finalValue,
    totalPrincipal,
    totalGain: finalValue - totalPrincipal,
  };
}
