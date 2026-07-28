import {
  GROWTH_ANNUAL_LIMIT,
  GROWTH_LIFETIME_LIMIT,
  LIFETIME_LIMIT,
  TSUMITATE_MONTHLY_LIMIT,
} from "@/constants/nisa";
import type { SimulationInput, SimulationResult, YearSnapshot } from "./types";

/**
 * 積立シミュレーション本体。
 *
 * 計算仕様（docs/requirements.md §3）:
 * - 月次複利、月利 = 年率 ÷ 12（金融庁つみたてシミュレーターと同方式）
 * - 積立は毎月末に入金し、翌月から利息が付く（期末払い年金方式）
 * - 毎月の積立はつみたて投資枠（月10万円まで）を優先し、超過分と
 *   ボーナス増額は成長投資枠として扱う
 * - 年間枠（つみたて120万/成長240万）・生涯枠（合計1,800万、
 *   うち成長1,200万）は簿価ベースで管理し、枠が尽きた分は投資されない
 */
export function simulateAccumulation(input: SimulationInput): SimulationResult {
  const monthlyRate = input.annualReturnPct / 100 / 12;
  const totalMonths = input.years * 12;

  const bonusByMonth = new Map<number, number>();
  for (const b of input.bonusAdditions ?? []) {
    bonusByMonth.set(b.month, (bonusByMonth.get(b.month) ?? 0) + b.amount);
  }

  let value = input.currentValue ?? 0;
  let tsumitateUsed = input.usedTsumitateQuota ?? 0;
  let growthUsed = input.usedGrowthQuota ?? 0;
  const initialPrincipal = tsumitateUsed + growthUsed;
  let totalContributed = 0;
  let uninvestedAmount = 0;
  let lifetimeCapReachedMonth: number | null = null;

  // 初期消化枠だけで既に生涯枠に達しているケース
  if (tsumitateUsed + growthUsed >= LIFETIME_LIMIT) {
    lifetimeCapReachedMonth = 0;
  }

  // つみたて枠の年間120万円は毎月上限10万円×12ヶ月で構造的に守られるため、
  // 年間カウンタは成長枠のみ持つ
  let yearGrowth = 0;
  const snapshots: YearSnapshot[] = [];

  for (let m = 1; m <= totalMonths; m++) {
    // 1. 既存資産の運用（月次複利）
    value *= 1 + monthlyRate;

    // 2. 月末の積立。つみたて枠優先、超過分＋ボーナスは成長枠
    const calendarMonth = ((m - 1) % 12) + 1;
    const bonus = bonusByMonth.get(calendarMonth) ?? 0;
    const wantTsumitate = Math.min(input.monthlyAmount, TSUMITATE_MONTHLY_LIMIT);
    const wantGrowth = input.monthlyAmount - wantTsumitate + bonus;

    const lifetimeRemaining = () =>
      Math.max(0, LIFETIME_LIMIT - tsumitateUsed - growthUsed);

    const toTsumitate = Math.min(wantTsumitate, lifetimeRemaining());
    tsumitateUsed += toTsumitate;

    const toGrowth = Math.min(
      wantGrowth,
      Math.max(0, GROWTH_ANNUAL_LIMIT - yearGrowth),
      Math.max(0, GROWTH_LIFETIME_LIMIT - growthUsed),
      lifetimeRemaining(),
    );
    growthUsed += toGrowth;
    yearGrowth += toGrowth;

    const invested = toTsumitate + toGrowth;
    value += invested;
    totalContributed += invested;
    uninvestedAmount += wantTsumitate + wantGrowth - invested;

    if (
      lifetimeCapReachedMonth === null &&
      tsumitateUsed + growthUsed >= LIFETIME_LIMIT
    ) {
      lifetimeCapReachedMonth = m;
    }

    // 3. 年末処理: スナップショット記録と年間枠のリセット
    if (calendarMonth === 12) {
      const year = m / 12;
      const principal = initialPrincipal + totalContributed;
      snapshots.push({
        year,
        age: input.currentAge !== undefined ? input.currentAge + year : undefined,
        value: Math.round(value),
        principal: Math.round(principal),
        gain: Math.round(value - principal),
        lifetimeUsed: Math.round(tsumitateUsed + growthUsed),
      });
      yearGrowth = 0;
    }
  }

  const totalPrincipal = initialPrincipal + totalContributed;
  return {
    snapshots,
    finalValue: Math.round(value),
    totalPrincipal: Math.round(totalPrincipal),
    totalGain: Math.round(value - totalPrincipal),
    lifetimeUsed: Math.round(tsumitateUsed + growthUsed),
    tsumitateUsed: Math.round(tsumitateUsed),
    growthUsed: Math.round(growthUsed),
    lifetimeCapReachedMonth,
    uninvestedAmount: Math.round(uninvestedAmount),
  };
}
