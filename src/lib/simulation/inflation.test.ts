import { describe, expect, it } from "vitest";
import { simulateAccumulation } from "./accumulate";
import { adjustForInflation } from "./inflation";

describe("adjustForInflation", () => {
  const base = simulateAccumulation({ monthlyAmount: 30_000, annualReturnPct: 5, years: 20 });

  it("インフレ率0以下ならそのまま返す", () => {
    expect(adjustForInflation(base, 0)).toBe(base);
    expect(adjustForInflation(base, -1)).toBe(base);
  });

  it("最終値が (1+i)^n で割り引かれる", () => {
    const adjusted = adjustForInflation(base, 2);
    expect(adjusted.finalValue).toBe(Math.round(base.finalValue / 1.02 ** 20));
    expect(adjusted.totalPrincipal).toBe(Math.round(base.totalPrincipal / 1.02 ** 20));
    expect(adjusted.totalGain).toBe(adjusted.finalValue - adjusted.totalPrincipal);
  });

  it("スナップショットは各年の経過年数で割り引かれる", () => {
    const adjusted = adjustForInflation(base, 2);
    const y5 = base.snapshots[4];
    expect(adjusted.snapshots[4].value).toBe(Math.round(y5.value / 1.02 ** 5));
  });

  it("非課税枠（簿価）は名目のまま", () => {
    const adjusted = adjustForInflation(base, 2);
    expect(adjusted.lifetimeUsed).toBe(base.lifetimeUsed);
    expect(adjusted.snapshots[10].lifetimeUsed).toBe(base.snapshots[10].lifetimeUsed);
  });
});
