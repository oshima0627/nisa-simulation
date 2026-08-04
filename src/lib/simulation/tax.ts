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
  // 課税対象は運用益のみ。元本割れ（マイナス）のときは課税されないので0で下限を切る
  const gain = Math.max(0, finalValue - totalPrincipal);
  // 運用益に譲渡益税率20.315%を掛けたものが、課税口座なら引かれていた税額
  const taxAmount = Math.round(gain * TAX_RATE);
  return {
    taxAmount,
    // 課税口座での手取り＝評価額から税額を引いたもの
    netValueTaxable: Math.round(finalValue - taxAmount),
    // NISAではこの税額がまるごと不要になるため、税額＝そのまま節税効果になる
    nisaBenefit: taxAmount,
  };
}
