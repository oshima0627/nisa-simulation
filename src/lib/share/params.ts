import {
  MAX_MONTHLY_AMOUNT,
  MAX_RETURN_PCT,
  MAX_YEARS,
} from "@/constants/nisa";
import type { SimulationInput } from "@/lib/simulation/types";

/**
 * シミュレーション条件 ⇔ URLクエリパラメータの相互変換。
 * URLだけで結果を再現できるようにする（サーバーには何も送らない）。
 *
 * キー: m=毎月積立額, r=利回り%, y=年数, cv=現在評価額,
 *       ut=消化済みつみたて枠, ug=消化済み成長枠,
 *       b1m/b1a, b2m/b2a=ボーナス月と金額, age=現在年齢,
 *       f=信託報酬%, i=インフレ率%
 */

/** 共有対象の状態。インフレ率は表示用設定だがURLで再現できるよう含める */
export type ShareableInput = SimulationInput & { inflationPct?: number };

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

function readNumber(
  params: URLSearchParams,
  key: string,
  min: number,
  max: number,
): number | undefined {
  const raw = params.get(key);
  if (raw === null) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return clamp(n, min, max);
}

export function inputToParams(input: ShareableInput): URLSearchParams {
  const params = new URLSearchParams();
  params.set("m", String(input.monthlyAmount));
  params.set("r", String(input.annualReturnPct));
  params.set("y", String(input.years));
  if (input.feeAnnualPct) params.set("f", String(input.feeAnnualPct));
  if (input.inflationPct) params.set("i", String(input.inflationPct));
  if (input.currentValue) params.set("cv", String(input.currentValue));
  if (input.usedTsumitateQuota) params.set("ut", String(input.usedTsumitateQuota));
  if (input.usedGrowthQuota) params.set("ug", String(input.usedGrowthQuota));
  input.bonusAdditions?.slice(0, 2).forEach((b, i) => {
    if (b.amount > 0) {
      params.set(`b${i + 1}m`, String(b.month));
      params.set(`b${i + 1}a`, String(b.amount));
    }
  });
  if (input.currentAge) params.set("age", String(input.currentAge));
  return params;
}

export function paramsToInput(params: URLSearchParams): ShareableInput | null {
  const monthlyAmount = readNumber(params, "m", 0, MAX_MONTHLY_AMOUNT);
  const annualReturnPct = readNumber(params, "r", 0, MAX_RETURN_PCT);
  const years = readNumber(params, "y", 1, MAX_YEARS);
  if (
    monthlyAmount === undefined ||
    annualReturnPct === undefined ||
    years === undefined
  ) {
    return null;
  }

  const bonusAdditions: SimulationInput["bonusAdditions"] = [];
  for (const i of [1, 2]) {
    const month = readNumber(params, `b${i}m`, 1, 12);
    const amount = readNumber(params, `b${i}a`, 0, 10_000_000);
    if (month !== undefined && amount !== undefined && amount > 0) {
      bonusAdditions.push({ month: Math.round(month), amount });
    }
  }

  return {
    monthlyAmount,
    annualReturnPct,
    years: Math.round(years),
    feeAnnualPct: readNumber(params, "f", 0, 5),
    inflationPct: readNumber(params, "i", 0, 10),
    currentValue: readNumber(params, "cv", 0, 1_000_000_000),
    usedTsumitateQuota: readNumber(params, "ut", 0, 18_000_000),
    usedGrowthQuota: readNumber(params, "ug", 0, 12_000_000),
    bonusAdditions: bonusAdditions.length > 0 ? bonusAdditions : undefined,
    currentAge: readNumber(params, "age", 0, 120),
  };
}
