import { describe, expect, it } from "vitest";
import { inputToParams, paramsToInput } from "./params";
import type { SimulationInput } from "@/lib/simulation/types";

describe("URLパラメータのシリアライズ", () => {
  it("往復変換で入力が保存される", () => {
    const input: SimulationInput = {
      monthlyAmount: 50_000,
      annualReturnPct: 5,
      years: 20,
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
