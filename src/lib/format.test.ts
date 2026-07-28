import { describe, expect, it } from "vitest";
import { formatInputYen, formatManYen, formatMonthOrdinal, formatYen } from "./format";

describe("formatInputYen: 入力金額は勝手に万円へ丸めない", () => {
  it("1万円で割り切れる金額は万円表示", () => {
    expect(formatInputYen(30_000)).toBe("3万円");
    expect(formatInputYen(100_000)).toBe("10万円");
    expect(formatInputYen(300_000)).toBe("30万円");
  });

  it("端数のある金額は円のまま表示", () => {
    expect(formatInputYen(35_000)).toBe("35,000円");
    expect(formatInputYen(48_700)).toBe("48,700円");
    expect(formatInputYen(9_999)).toBe("9,999円");
  });

  it("0円はそのまま", () => {
    expect(formatInputYen(0)).toBe("0円");
  });
});

describe("既存フォーマッタ", () => {
  it("formatManYen は万円へ四捨五入", () => {
    expect(formatManYen(12_331_010)).toBe("1,233万円");
    expect(formatManYen(35_000)).toBe("4万円");
  });

  it("formatYen は円のまま", () => {
    expect(formatYen(12_331_010)).toBe("12,331,010円");
  });

  it("formatMonthOrdinal", () => {
    expect(formatMonthOrdinal(60)).toBe("5年目の12ヶ月目");
    expect(formatMonthOrdinal(61)).toBe("6年目の1ヶ月目");
  });
});
