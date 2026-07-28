/**
 * 新NISA（2024年〜）の制度定数。
 * 制度改正時はこのファイルの変更のみで全計算に反映される。
 * 出典: 金融庁「新しいNISA」 https://www.fsa.go.jp/policy/nisa2/
 */

/** つみたて投資枠の年間上限（円） */
export const TSUMITATE_ANNUAL_LIMIT = 1_200_000;

/** 成長投資枠の年間上限（円） */
export const GROWTH_ANNUAL_LIMIT = 2_400_000;

/** 年間投資枠の合計（円） */
export const ANNUAL_LIMIT = TSUMITATE_ANNUAL_LIMIT + GROWTH_ANNUAL_LIMIT;

/** 生涯非課税保有限度額（簿価ベース、円） */
export const LIFETIME_LIMIT = 18_000_000;

/** 生涯枠のうち成長投資枠で使える上限（簿価ベース、円） */
export const GROWTH_LIFETIME_LIMIT = 12_000_000;

/** つみたて投資枠の毎月上限（円）。年間120万円 ÷ 12ヶ月 */
export const TSUMITATE_MONTHLY_LIMIT = TSUMITATE_ANNUAL_LIMIT / 12;

/** 特定口座の譲渡益税率（所得税15% + 復興特別所得税0.315% + 住民税5%） */
export const TAX_RATE = 0.20315;

/** 入力バリデーション: 毎月積立額の上限（円）。年間投資枠360万円 ÷ 12ヶ月 */
export const MAX_MONTHLY_AMOUNT = ANNUAL_LIMIT / 12;

/** 入力バリデーション: 毎月積立額の下限（円） */
export const MIN_MONTHLY_AMOUNT = 100;

/** 入力バリデーション: 想定利回りの上限（%） */
export const MAX_RETURN_PCT = 15;

/** 「楽観的な水準」警告を出す利回りの閾値（%） */
export const WARN_RETURN_PCT = 10;

/** 入力バリデーション: 積立期間の上限（年） */
export const MAX_YEARS = 50;
