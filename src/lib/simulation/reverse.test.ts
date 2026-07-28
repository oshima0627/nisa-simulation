import { describe, expect, it } from "vitest";
import { reverseFromTarget } from "./reverse";
import { simulateAccumulation } from "./accumulate";

describe("reverseFromTarget: 目標額からの逆算", () => {
  it("利回り0%: 120万円を1年なら月10万円", () => {
    const r = reverseFromTarget({ targetAmount: 1_200_000, years: 1, annualReturnPct: 0 });
    expect(r.achievable).toBe(true);
    expect(r.requiredMonthly).toBe(100_000);
  });

  it("求めた月額で実際に目標へ届き、100円少ないと届かない（最小性）", () => {
    const input = { targetAmount: 10_000_000, years: 20, annualReturnPct: 5 };
    const r = reverseFromTarget(input);
    expect(r.achievable).toBe(true);
    const monthly = r.requiredMonthly!;
    expect(
      simulateAccumulation({ monthlyAmount: monthly, annualReturnPct: 5, years: 20 }).finalValue,
    ).toBeGreaterThanOrEqual(input.targetAmount);
    expect(
      simulateAccumulation({ monthlyAmount: monthly - 100, annualReturnPct: 5, years: 20 })
        .finalValue,
    ).toBeLessThan(input.targetAmount);
    expect(monthly % 100).toBe(0);
  });

  it("信託報酬を渡すと必要月額が増える", () => {
    const without = reverseFromTarget({ targetAmount: 10_000_000, years: 20, annualReturnPct: 5 });
    const withFee = reverseFromTarget({
      targetAmount: 10_000_000,
      years: 20,
      annualReturnPct: 5,
      feeAnnualPct: 1,
    });
    expect(withFee.requiredMonthly!).toBeGreaterThan(without.requiredMonthly!);
  });

  it("生涯枠の停止を考慮する（単純な年金公式では届く額でも枠停止で届かないケース）", () => {
    // 月30万×10年 = 名目3,600万だが、簿価は1,800万で停止する。
    // 目標をその間に設定し、二分探索が枠停止込みの評価額で判定することを確認
    const maxFinal = simulateAccumulation({
      monthlyAmount: 300_000,
      annualReturnPct: 5,
      years: 10,
    }).finalValue;
    const r = reverseFromTarget({
      targetAmount: maxFinal,
      years: 10,
      annualReturnPct: 5,
    });
    expect(r.achievable).toBe(true);
    expect(r.requiredMonthly).toBe(300_000);
  });

  it("期間内に届かない場合は最短年数を返す", () => {
    const r = reverseFromTarget({ targetAmount: 30_000_000, years: 5, annualReturnPct: 5 });
    expect(r.achievable).toBe(false);
    expect(r.requiredMonthly).toBeNull();
    expect(r.minYears).not.toBeNull();
    // 返された最短年数では届き、その1年前では届かない
    const y = r.minYears!;
    expect(
      simulateAccumulation({ monthlyAmount: 300_000, annualReturnPct: 5, years: y }).finalValue,
    ).toBeGreaterThanOrEqual(30_000_000);
    expect(
      simulateAccumulation({ monthlyAmount: 300_000, annualReturnPct: 5, years: y - 1 }).finalValue,
    ).toBeLessThan(30_000_000);
  });

  it("50年でも届かない目標は minYears も null", () => {
    const r = reverseFromTarget({ targetAmount: 10_000_000_000, years: 10, annualReturnPct: 3 });
    expect(r.achievable).toBe(false);
    expect(r.minYears).toBeNull();
  });
});
