/** ボーナス月の増額設定（成長投資枠として扱う） */
export interface BonusAddition {
  /** 1〜12 の月 */
  month: number;
  /** 増額分（円） */
  amount: number;
}

/** シミュレーション入力。金額はすべて円、率は % */
export interface SimulationInput {
  /** 毎月積立額（円） */
  monthlyAmount: number;
  /** 想定利回り（年率%、信託報酬控除前） */
  annualReturnPct: number;
  /** 信託報酬（年率%）。実質利回り = annualReturnPct - feeAnnualPct */
  feeAnnualPct?: number;
  /** 積立期間（年） */
  years: number;
  /** 現在のNISA評価額（円）。詳細モード用 */
  currentValue?: number;
  /** 消化済みつみたて投資枠（簿価、円）。詳細モード用 */
  usedTsumitateQuota?: number;
  /** 消化済み成長投資枠（簿価、円）。詳細モード用 */
  usedGrowthQuota?: number;
  /** ボーナス月の増額（年2回まで）。詳細モード用 */
  bonusAdditions?: BonusAddition[];
  /** 現在年齢。グラフの年齢表示用（計算には影響しない） */
  currentAge?: number;
}

/** 年末時点のスナップショット */
export interface YearSnapshot {
  /** 経過年数（1始まり） */
  year: number;
  /** その年末時点の年齢（currentAge 入力時のみ） */
  age?: number;
  /** 評価額（円） */
  value: number;
  /** 投資元本 = 初期簿価 + 累計積立（円） */
  principal: number;
  /** 運用益 = 評価額 - 投資元本（円） */
  gain: number;
  /** 生涯枠の消化額（簿価、円） */
  lifetimeUsed: number;
}

/** シミュレーション結果 */
export interface SimulationResult {
  /** 年ごとのスナップショット */
  snapshots: YearSnapshot[];
  /** 最終評価額（円） */
  finalValue: number;
  /** 投資元本合計（円） */
  totalPrincipal: number;
  /** 運用益合計（円） */
  totalGain: number;
  /** 生涯枠の最終消化額（簿価、円） */
  lifetimeUsed: number;
  /** うち、つみたて投資枠の消化額（円） */
  tsumitateUsed: number;
  /** うち、成長投資枠の消化額（円） */
  growthUsed: number;
  /** 生涯枠1,800万円に到達した月（1始まりの通算月数）。未到達なら null */
  lifetimeCapReachedMonth: number | null;
  /** 枠制限により投資できなかった金額の合計（円） */
  uninvestedAmount: number;
}
