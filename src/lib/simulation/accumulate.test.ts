import { describe, expect, it } from "vitest";
import { simulateAccumulation } from "./accumulate";

/** 期末払い年金終価（金融庁方式）: FV = P * ((1+r)^n - 1) / r */
function ordinaryAnnuityFV(monthly: number, annualPct: number, years: number): number {
  const r = annualPct / 100 / 12;
  const n = years * 12;
  if (r === 0) return monthly * n;
  return (monthly * ((1 + r) ** n - 1)) / r;
}

describe("simulateAccumulation: 基本の複利計算", () => {
  it("利回り0%なら評価額 = 元本", () => {
    const result = simulateAccumulation({
      monthlyAmount: 10_000,
      annualReturnPct: 0,
      years: 1,
    });
    expect(result.finalValue).toBe(120_000);
    expect(result.totalPrincipal).toBe(120_000);
    expect(result.totalGain).toBe(0);
  });

  it("毎月3万円・年利5%・20年で年金終価公式と一致（金融庁方式）", () => {
    const result = simulateAccumulation({
      monthlyAmount: 30_000,
      annualReturnPct: 5,
      years: 20,
    });
    const expected = ordinaryAnnuityFV(30_000, 5, 20);
    expect(result.finalValue).toBeCloseTo(expected, 0);
    expect(result.totalPrincipal).toBe(30_000 * 240);
    // 金融庁つみたてシミュレーターの公表値: 約1,233万円
    expect(result.finalValue).toBeGreaterThan(12_300_000);
    expect(result.finalValue).toBeLessThan(12_350_000);
  });

  it("複数の利回り・期間で年金終価公式と一致（生涯枠に収まる範囲）", () => {
    for (const [monthly, pct, years] of [
      [50_000, 3, 10],
      [40_000, 7, 30],
      [100_000, 7, 15], // 元本ちょうど1,800万円の境界
      [5_000, 1, 5],
    ] as const) {
      const result = simulateAccumulation({
        monthlyAmount: monthly,
        annualReturnPct: pct,
        years,
      });
      expect(result.finalValue).toBeCloseTo(ordinaryAnnuityFV(monthly, pct, years), 0);
    }
  });

  it("年ごとのスナップショットが期間分あり、単調増加する", () => {
    const result = simulateAccumulation({
      monthlyAmount: 30_000,
      annualReturnPct: 5,
      years: 20,
    });
    expect(result.snapshots).toHaveLength(20);
    for (let i = 1; i < result.snapshots.length; i++) {
      expect(result.snapshots[i].value).toBeGreaterThan(result.snapshots[i - 1].value);
    }
    expect(result.snapshots.at(-1)!.value).toBe(result.finalValue);
  });
});

describe("simulateAccumulation: 非課税枠の管理", () => {
  it("毎月30万円（年360万円）は年間枠ちょうどで全額投資される", () => {
    const result = simulateAccumulation({
      monthlyAmount: 300_000,
      annualReturnPct: 0,
      years: 1,
    });
    expect(result.totalPrincipal).toBe(3_600_000);
    expect(result.tsumitateUsed).toBe(1_200_000);
    expect(result.growthUsed).toBe(2_400_000);
    expect(result.uninvestedAmount).toBe(0);
  });

  it("毎月30万円なら5年（60ヶ月）で生涯枠1,800万円に到達し、以降の積立は停止する", () => {
    const result = simulateAccumulation({
      monthlyAmount: 300_000,
      annualReturnPct: 0,
      years: 10,
    });
    expect(result.lifetimeCapReachedMonth).toBe(60);
    expect(result.totalPrincipal).toBe(18_000_000);
    expect(result.lifetimeUsed).toBe(18_000_000);
    // 6年目以降の積立分（月30万 × 60ヶ月）は投資されない
    expect(result.uninvestedAmount).toBe(300_000 * 60);
  });

  it("生涯枠到達後も運用は継続する", () => {
    const result = simulateAccumulation({
      monthlyAmount: 300_000,
      annualReturnPct: 5,
      years: 10,
    });
    expect(result.totalPrincipal).toBe(18_000_000);
    expect(result.finalValue).toBeGreaterThan(18_000_000);
  });

  it("月10万円以下はすべてつみたて投資枠に入る", () => {
    const result = simulateAccumulation({
      monthlyAmount: 100_000,
      annualReturnPct: 0,
      years: 2,
    });
    expect(result.tsumitateUsed).toBe(2_400_000);
    expect(result.growthUsed).toBe(0);
  });

  it("月10万円超過分は成長投資枠に入る", () => {
    const result = simulateAccumulation({
      monthlyAmount: 150_000,
      annualReturnPct: 0,
      years: 1,
    });
    expect(result.tsumitateUsed).toBe(1_200_000);
    expect(result.growthUsed).toBe(600_000);
  });

  it("成長枠の生涯上限1,200万円に達したら、つみたて枠のみ積立が続く", () => {
    // 月30万円: 成長20万/月 → 60ヶ月で成長枠1,200万到達。
    // 同時に合計も1,800万に到達するため、月25万で検証する
    // （つみたて10万 + 成長15万/月 → 成長枠は80ヶ月で1,200万到達、
    //   合計はその時点で 10万*80 + 1,200万 = 2,000万 > 1,800万 …
    //   よって先に生涯枠が72ヶ月（25万*72=1,800万）で尽きる）
    // 成長枠上限を単独で先に踏むケース: 消化済み成長枠を初期値で与える
    const result = simulateAccumulation({
      monthlyAmount: 150_000,
      annualReturnPct: 0,
      years: 2,
      usedGrowthQuota: 11_800_000,
    });
    // 成長枠の残り20万円 → 成長投資は4ヶ月分（5万/月）で停止
    expect(result.growthUsed).toBe(12_000_000);
    // つみたて枠は2年間フルに積み立てられる
    expect(result.tsumitateUsed).toBe(2_400_000);
  });

  it("消化済み枠が既に生涯上限なら積立は一切行われない", () => {
    const result = simulateAccumulation({
      monthlyAmount: 100_000,
      annualReturnPct: 0,
      years: 1,
      currentValue: 20_000_000,
      usedTsumitateQuota: 6_000_000,
      usedGrowthQuota: 12_000_000,
    });
    expect(result.lifetimeCapReachedMonth).toBe(0);
    expect(result.totalPrincipal).toBe(18_000_000);
    expect(result.finalValue).toBe(20_000_000);
  });
});

describe("simulateAccumulation: 詳細モード入力", () => {
  it("現在の評価額は初月から運用に乗る", () => {
    const result = simulateAccumulation({
      monthlyAmount: 0,
      annualReturnPct: 12, // 月利1%
      years: 1,
      currentValue: 1_000_000,
      usedTsumitateQuota: 800_000,
    });
    expect(result.finalValue).toBeCloseTo(Math.round(1_000_000 * 1.01 ** 12), 0);
    expect(result.totalPrincipal).toBe(800_000);
    expect(result.totalGain).toBe(result.finalValue - 800_000);
  });

  it("ボーナス増額は指定月に成長投資枠として加算される", () => {
    const result = simulateAccumulation({
      monthlyAmount: 50_000,
      annualReturnPct: 0,
      years: 1,
      bonusAdditions: [
        { month: 6, amount: 200_000 },
        { month: 12, amount: 200_000 },
      ],
    });
    expect(result.totalPrincipal).toBe(50_000 * 12 + 400_000);
    expect(result.tsumitateUsed).toBe(600_000);
    expect(result.growthUsed).toBe(400_000);
  });

  it("ボーナス増額が成長枠の年間上限を超えた分は投資されない", () => {
    const result = simulateAccumulation({
      monthlyAmount: 0,
      annualReturnPct: 0,
      years: 1,
      bonusAdditions: [{ month: 6, amount: 3_000_000 }],
    });
    expect(result.growthUsed).toBe(2_400_000);
    expect(result.uninvestedAmount).toBe(600_000);
  });

  it("現在年齢を渡すとスナップショットに年齢が付く", () => {
    const result = simulateAccumulation({
      monthlyAmount: 10_000,
      annualReturnPct: 3,
      years: 3,
      currentAge: 30,
    });
    expect(result.snapshots.map((s) => s.age)).toEqual([31, 32, 33]);
  });
});
