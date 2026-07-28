import { describe, expect, it } from "vitest";
import { simulateWithdrawal } from "./withdraw";
import { TAX_RATE } from "@/constants/nisa";

describe("simulateWithdrawal: 定額方式", () => {
  it("利回り0%: 1,200万円を月10万円なら120ヶ月（10年）でちょうど尽きる", () => {
    const r = simulateWithdrawal({
      startValue: 12_000_000,
      startBook: 12_000_000,
      annualReturnPct: 0,
      method: "fixed",
      monthlyAmount: 100_000,
    });
    expect(r.depletionMonth).toBe(120);
    expect(r.totalWithdrawn).toBe(12_000_000);
    expect(r.finalValue).toBe(0);
  });

  it("毎月の運用益が取り崩し額を上回れば資産は尽きず増え続ける", () => {
    // 3,000万円 × 5%/12 = 月12.5万円 > 月10万円
    const r = simulateWithdrawal({
      startValue: 30_000_000,
      startBook: 18_000_000,
      annualReturnPct: 5,
      method: "fixed",
      monthlyAmount: 100_000,
      maxYears: 30,
    });
    expect(r.depletionMonth).toBeNull();
    expect(r.finalValue).toBeGreaterThan(30_000_000);
    expect(r.snapshots).toHaveLength(30);
  });

  it("運用しながらの取り崩しは単純割り算より長持ちする", () => {
    // 2,000万円を月10万円: 運用なしなら200ヶ月
    const r = simulateWithdrawal({
      startValue: 20_000_000,
      startBook: 18_000_000,
      annualReturnPct: 3,
      method: "fixed",
      monthlyAmount: 100_000,
    });
    expect(r.depletionMonth).toBeGreaterThan(200);
  });
});

describe("simulateWithdrawal: 定率方式", () => {
  it("定率では資産は尽きない（漸減する）", () => {
    const r = simulateWithdrawal({
      startValue: 20_000_000,
      startBook: 18_000_000,
      annualReturnPct: 0,
      method: "rate",
      annualRatePct: 4,
      maxYears: 30,
    });
    expect(r.depletionMonth).toBeNull();
    expect(r.finalValue).toBeGreaterThan(0);
    // 利回り0% & 年率4%（月割）で1年後: (1 - 0.04/12)^12
    const expected = Math.round(20_000_000 * (1 - 0.04 / 12) ** 12);
    expect(r.snapshots[0].value).toBe(expected);
  });

  it("利回り > 取り崩し率なら資産は増えながら受け取れる", () => {
    const r = simulateWithdrawal({
      startValue: 20_000_000,
      startBook: 18_000_000,
      annualReturnPct: 5,
      method: "rate",
      annualRatePct: 4,
      maxYears: 30,
    });
    expect(r.finalValue).toBeGreaterThan(20_000_000);
    expect(r.totalWithdrawn).toBeGreaterThan(0);
  });
});

describe("simulateWithdrawal: 枠復活と課税比較", () => {
  it("全部取り崩すと簿価全額が枠復活の対象になる", () => {
    const r = simulateWithdrawal({
      startValue: 12_000_000,
      startBook: 9_000_000,
      annualReturnPct: 0,
      method: "fixed",
      monthlyAmount: 100_000,
    });
    expect(r.depletionMonth).toBe(120);
    expect(r.restoredQuotaTotal).toBe(9_000_000);
  });

  it("含み益がない（簿価=評価額）なら節税額はゼロ", () => {
    const r = simulateWithdrawal({
      startValue: 12_000_000,
      startBook: 12_000_000,
      annualReturnPct: 0,
      method: "fixed",
      monthlyAmount: 100_000,
    });
    expect(r.taxSavedVsTaxable).toBe(0);
  });

  it("利回り0%なら節税額 = 利益部分 × 20.315%（比率一定）", () => {
    // 簿価600万/評価額1,200万 → 受取の半分が利益
    const r = simulateWithdrawal({
      startValue: 12_000_000,
      startBook: 6_000_000,
      annualReturnPct: 0,
      method: "fixed",
      monthlyAmount: 100_000,
    });
    expect(r.taxSavedVsTaxable).toBe(Math.round(6_000_000 * TAX_RATE));
  });

  it("復活枠の累計はスナップショットで単調増加する", () => {
    const r = simulateWithdrawal({
      startValue: 20_000_000,
      startBook: 15_000_000,
      annualReturnPct: 3,
      method: "fixed",
      monthlyAmount: 150_000,
      maxYears: 20,
    });
    for (let i = 1; i < r.snapshots.length; i++) {
      expect(r.snapshots[i].restoredQuotaCumulative).toBeGreaterThanOrEqual(
        r.snapshots[i - 1].restoredQuotaCumulative,
      );
    }
  });
});
