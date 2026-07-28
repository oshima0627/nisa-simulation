import { describe, expect, it } from "vitest";
import { compareTaxableAccount } from "./tax";

describe("compareTaxableAccount", () => {
  it("運用益に20.315%が課税される", () => {
    const result = compareTaxableAccount(1_000_000, 600_000);
    expect(result.taxAmount).toBe(Math.round(400_000 * 0.20315));
    expect(result.netValueTaxable).toBe(1_000_000 - result.taxAmount);
    expect(result.nisaBenefit).toBe(result.taxAmount);
  });

  it("含み損（評価額 < 元本）なら税額ゼロ", () => {
    const result = compareTaxableAccount(500_000, 600_000);
    expect(result.taxAmount).toBe(0);
    expect(result.netValueTaxable).toBe(500_000);
    expect(result.nisaBenefit).toBe(0);
  });

  it("運用益ゼロなら税額ゼロ", () => {
    const result = compareTaxableAccount(600_000, 600_000);
    expect(result.taxAmount).toBe(0);
  });
});
