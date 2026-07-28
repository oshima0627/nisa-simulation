import { TAX_RATE } from "@/constants/nisa";

/** 課税口座（特定口座）との比較結果 */
export interface TaxComparison {
  /** 課税口座で同条件運用した場合の税額（円） */
  taxAmount: number;
  /** 課税口座の税引後受取額（円） */
  netValueTaxable: number;
  /** NISAの節税効果 = 課税されるはずだった税額（円） */
  nisaBenefit: number;
}

/**
 * 同じ評価額・元本を課税口座で運用していた場合との比較。
 * 売却時に運用益へ一括課税される簡易モデル（分配金再投資型を想定）。
 */
export function compareTaxableAccount(
  finalValue: number,
  totalPrincipal: number,
): TaxComparison {
  const gain = Math.max(0, finalValue - totalPrincipal);
  const taxAmount = Math.round(gain * TAX_RATE);
  return {
    taxAmount,
    netValueTaxable: Math.round(finalValue - taxAmount),
    nisaBenefit: taxAmount,
  };
}
