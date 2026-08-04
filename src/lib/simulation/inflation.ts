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
  // インフレ率0以下なら換算不要。元の結果をそのまま返す
  if (inflationPct <= 0) return result;
  // 経過年数に応じた割引係数。n年後の1円は現在の 1 / (1+i)^n 円に相当する
  const factor = (year: number) => (1 + inflationPct / 100) ** year;

  // 各年のスナップショットを、その年の割引係数で個別に換算する。
  // 年ごとに経過年数が違うので、係数もスナップショットごとに変わる点に注意
  const snapshots = result.snapshots.map((s) => ({
    ...s,
    value: Math.round(s.value / factor(s.year)),
    principal: Math.round(s.principal / factor(s.year)),
    // 丸め誤差で value - principal と食い違わないよう、割引後の値どうしで引き算する
    gain: Math.round(s.value / factor(s.year) - s.principal / factor(s.year)),
  }));

  // サマリー（最終評価額など）は最終年の係数で換算する
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
