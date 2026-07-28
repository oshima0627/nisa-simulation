import { describe, expect, it } from "vitest";
import { inputToParams, paramsToInput, type ShareableInput } from "./params";

describe("URLパラメータのシリアライズ", () => {
  it("往復変換で入力が保存される", () => {
    const input: ShareableInput = {
      monthlyAmount: 50_000,
      annualReturnPct: 5,
      years: 20,
      feeAnnualPct: 0.2,
      inflationPct: 2,
      currentValue: 1_000_000,
      usedTsumitateQuota: 800_000,
      usedGrowthQuota: 200_000,
      bonusAdditions: [
        { month: 6, amount: 100_000 },
        { month: 12, amount: 200_000 },
      ],
      currentAge: 32,
    };
    const restored = paramsToInput(inputToParams(input));
    expect(restored).toEqual(input);
  });

  it("かんたんモード（3項目のみ）はコンパクトなURLになる", () => {
    const params = inputToParams({
      monthlyAmount: 30_000,
      annualReturnPct: 5,
      years: 20,
    });
    expect(params.toString()).toBe("m=30000&r=5&y=20");
  });

  it("取り崩し設定も往復変換できる", () => {
    const input: ShareableInput = {
      monthlyAmount: 50_000,
      annualReturnPct: 5,
      years: 20,
      withdraw: {
        method: "fixed",
        deferYears: 5,
        monthlyAmount: 150_000,
        annualRatePct: 4, // fixedでは未シリアライズ→復元時デフォルト4
      },
    };
    expect(paramsToInput(inputToParams(input))).toEqual(input);

    const rateInput: ShareableInput = {
      monthlyAmount: 50_000,
      annualReturnPct: 5,
      years: 20,
      withdraw: {
        method: "rate",
        deferYears: 0,
        monthlyAmount: 100_000, // rateでは未シリアライズ→復元時デフォルト10万
        annualRatePct: 3,
      },
    };
    expect(paramsToInput(inputToParams(rateInput))).toEqual(rateInput);
  });

  it("必須キーが欠けていたら null", () => {
    expect(paramsToInput(new URLSearchParams("m=30000&r=5"))).toBeNull();
    expect(paramsToInput(new URLSearchParams(""))).toBeNull();
  });

  it("不正値・範囲外は安全にクランプまたは無視される", () => {
    const input = paramsToInput(
      new URLSearchParams("m=99999999&r=abc&y=20"),
    );
    expect(input).toBeNull(); // r が数値でない

    const clamped = paramsToInput(new URLSearchParams("m=99999999&r=999&y=999"));
    expect(clamped?.monthlyAmount).toBe(300_000);
    expect(clamped?.annualReturnPct).toBe(15);
    expect(clamped?.years).toBe(50);
  });
});
