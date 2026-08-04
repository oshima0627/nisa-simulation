import { MAX_MONTHLY_AMOUNT, MAX_YEARS } from "@/constants/nisa";
import { simulateAccumulation } from "./accumulate";

export interface ReverseInput {
  /** 目標金額（円） */
  targetAmount: number;
  /** 期間（年） */
  years: number;
  /** 想定利回り（年率%、信託報酬控除前） */
  annualReturnPct: number;
  /** 信託報酬（年率%） */
  feeAnnualPct?: number;
}

export interface ReverseResult {
  /** 必要な毎月積立額（100円単位切り上げ）。期間内に届かない場合は null */
  requiredMonthly: number | null;
  /** 月30万円上限・非課税枠の範囲で目標に到達できるか */
  achievable: boolean;
  /** requiredMonthly で積み立てた場合の最終評価額（円） */
  finalValue: number | null;
  /**
   * 期間内に届かない場合: 毎月上限30万円で積み立てたときに目標へ届く最短年数。
   * 50年でも届かない場合は null
   */
  minYears: number | null;
}

/** 二分探索の刻み幅（円）。必要月額は100円単位に丸めて提示する */
const STEP = 100;

/** 指定条件で積み立てたときの最終評価額だけを取り出すヘルパー */
function finalValueOf(
  monthly: number,
  years: number,
  annualReturnPct: number,
  feeAnnualPct?: number,
): number {
  return simulateAccumulation({
    monthlyAmount: monthly,
    annualReturnPct,
    years,
    feeAnnualPct,
  }).finalValue;
}

/**
 * 目標額からの逆算。
 * 年金終価公式の逆算ではなく、積立シミュレーション本体を使った二分探索で
 * 必要月額を求める。これにより年間枠・生涯枠1,800万円による積立停止も
 * 正しく反映される（公式だけでは枠到達後の停止を考慮できない）。
 */
export function reverseFromTarget(input: ReverseInput): ReverseResult {
  const { targetAmount, years, annualReturnPct, feeAnnualPct } = input;

  // まず実現可能性の判定。上限いっぱい（月30万円）で積んでも届かないなら、
  // その期間ではどうやっても目標に到達できない
  const maxFinal = finalValueOf(MAX_MONTHLY_AMOUNT, years, annualReturnPct, feeAnnualPct);
  if (maxFinal < targetAmount) {
    // 期間内には届かない → 月30万円で届く最短年数を探す。
    // 年数は最大50なので、指定年数の翌年から順に線形に試すだけで足りる
    let minYears: number | null = null;
    for (let y = years + 1; y <= MAX_YEARS; y++) {
      if (finalValueOf(MAX_MONTHLY_AMOUNT, y, annualReturnPct, feeAnnualPct) >= targetAmount) {
        minYears = y;
        break;
      }
    }
    // minYears が null のままなら50年かけても届かない（利回りが低すぎる等）
    return { requiredMonthly: null, achievable: false, finalValue: null, minYears };
  }

  // 100円単位で最小の月額を二分探索（最終評価額は月額に対して単調非減少）。
  // 探索範囲は「STEP単位の個数」で持つ: lo=1 → 100円、hi=3000 → 30万円
  let lo = 1; // 100円
  let hi = MAX_MONTHLY_AMOUNT / STEP; // 30万円
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (finalValueOf(mid * STEP, years, annualReturnPct, feeAnnualPct) >= targetAmount) {
      // mid でも目標に届く → 答えは mid 以下。mid 自身も候補として残す
      hi = mid;
    } else {
      // mid では足りない → 答えは mid より大きい
      lo = mid + 1;
    }
  }
  // lo と hi が一致した時点で「目標に届く最小の月額」が確定している
  const requiredMonthly = lo * STEP;
  return {
    requiredMonthly,
    achievable: true,
    finalValue: finalValueOf(requiredMonthly, years, annualReturnPct, feeAnnualPct),
    minYears: null,
  };
}
