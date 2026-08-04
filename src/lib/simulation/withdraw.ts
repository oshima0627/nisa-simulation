import { TAX_RATE } from "@/constants/nisa";

export type WithdrawMethod = "fixed" | "rate";

export interface WithdrawInput {
  /** 取り崩し開始時の評価額（円） */
  startValue: number;
  /** 取り崩し開始時の簿価＝取得価額の合計（円）。枠復活と課税比較の計算に使う */
  startBook: number;
  /** 取り崩し期間中の想定利回り（年率%、信託報酬控除前） */
  annualReturnPct: number;
  /** 信託報酬（年率%） */
  feeAnnualPct?: number;
  /** 取り崩し方式: 定額（毎月◯円） or 定率（年◯%を12分割して毎月） */
  method: WithdrawMethod;
  /** 定額方式: 毎月の取り崩し額（円） */
  monthlyAmount?: number;
  /** 定率方式: 年間の取り崩し率（%） */
  annualRatePct?: number;
  /** シミュレーション上限（年）。デフォルト50年 */
  maxYears?: number;
}

export interface WithdrawYearSnapshot {
  /** 取り崩し開始からの経過年数（1始まり） */
  year: number;
  /** 年末（または資産が尽きた月）の評価額（円） */
  value: number;
  /** その年に受け取った額（円） */
  withdrawnThisYear: number;
  /** 累計受取額（円） */
  withdrawnCumulative: number;
  /** 累計の枠復活額（簿価ベース、円）。売却の翌年に生涯枠へ戻る */
  restoredQuotaCumulative: number;
}

export interface WithdrawResult {
  snapshots: WithdrawYearSnapshot[];
  /** 資産が尽きる通算月数（1始まり）。上限年数まで尽きなければ null */
  depletionMonth: number | null;
  /** 累計受取額（円） */
  totalWithdrawn: number;
  /** シミュレーション終了時の残高（円） */
  finalValue: number;
  /** 取り崩しにより生涯枠へ復活する簿価の合計（円） */
  restoredQuotaTotal: number;
  /** 課税口座で同じ取り崩しをした場合に払っていた税額の概算（円） */
  taxSavedVsTaxable: number;
}

/**
 * 取り崩しシミュレーション。
 *
 * - 月次で「運用 → 取り崩し」を繰り返す（積立フェーズと同じ月次複利）
 * - 売却分の簿価は評価額に対する簿価比率で按分し、生涯枠への復活額
 *   （翌年復活）として累計する。復活枠への再投資は行わない（v1仕様）
 * - 課税口座比較は「受取額のうち利益部分 × 20.315%」を受取時課税する
 *   簡易モデル。NISAでは非課税なので、この累計が節税額になる
 */
export function simulateWithdrawal(input: WithdrawInput): WithdrawResult {
  // 積立フェーズと同じ考え方: 想定利回りから信託報酬を引いた実質年率を月割りする
  const effectiveAnnualPct = input.annualReturnPct - (input.feeAnnualPct ?? 0);
  const monthlyRate = effectiveAnnualPct / 100 / 12;
  // 資産が尽きなくてもここで打ち切る（無限ループ防止と、表示上の上限を兼ねる）
  const maxMonths = (input.maxYears ?? 50) * 12;

  // --- ループ中に更新していく状態 ---
  // value: 残っている評価額（時価）
  let value = input.startValue;
  // book: 残っている簿価（取得価額）。売却時に「元本部分」と「利益部分」を
  //       分けるために追跡する。異常値でオーバーフローしないよう上限で抑える
  let book = Math.min(input.startBook, Number.MAX_SAFE_INTEGER);
  // totalWithdrawn: 累計の受取額
  let totalWithdrawn = 0;
  // restoredQuota: 売却した簿価の累計＝翌年に復活する生涯枠の合計
  let restoredQuota = 0;
  // taxSaved: 課税口座なら払っていたはずの税額の累計（＝NISAの節税効果）
  let taxSaved = 0;
  // depletionMonth: 資産が尽きた通算月。最後まで尽きなければ null
  let depletionMonth: number | null = null;
  // withdrawnThisYear: 年ごとの受取額。スナップショットを積むたびに0へ戻す
  let withdrawnThisYear = 0;
  const snapshots: WithdrawYearSnapshot[] = [];

  // 年末（または枯渇時）に1年分の記録を積み、年内カウンタをリセットする
  const pushSnapshot = (year: number) => {
    snapshots.push({
      year,
      // 枯渇時にわずかなマイナスが出ることがあるので0で下限を切る
      value: Math.max(0, Math.round(value)),
      withdrawnThisYear: Math.round(withdrawnThisYear),
      withdrawnCumulative: Math.round(totalWithdrawn),
      restoredQuotaCumulative: Math.round(restoredQuota),
    });
    withdrawnThisYear = 0;
  };

  for (let m = 1; m <= maxMonths; m++) {
    // 1. 運用。取り崩し中も残った資産は運用を続ける前提
    value *= 1 + monthlyRate;

    // 2. 取り崩し。
    //    定額 = 毎月同じ金額、定率 = その時点の残高 × 年率 ÷ 12（残高に連動して減る）
    const want =
      input.method === "fixed"
        ? (input.monthlyAmount ?? 0)
        : value * ((input.annualRatePct ?? 0) / 100 / 12);
    // 残高より多くは引き出せないので、最後の月は残高ぶんだけ引き出す
    const w = Math.min(want, value);

    if (w > 0 && value > 0) {
      // 簿価は評価額に対する比率で按分して減らす（加重平均法）。
      // 例: 評価額1,000万・簿価600万のときに100万売ると、簿価は60万・利益は40万。
      //     book を超えないよう Math.min で保険をかけている
      const bookPortion = Math.min(book, w * (book / value));
      const gainPortion = Math.max(0, w - bookPortion);
      // 利益部分にだけ課税されるので、そこに税率を掛けた額が節税額になる
      taxSaved += gainPortion * TAX_RATE;
      book -= bookPortion;
      // 売却した簿価の分だけ生涯枠が翌年に復活する
      restoredQuota += bookPortion;
      value -= w;
      totalWithdrawn += w;
      withdrawnThisYear += w;
    }

    // 3. 資産が尽きたら終了（1円未満は尽きたとみなす）。
    //    年の途中でも、その時点までの記録を1年分として積んでループを抜ける
    if (value < 1) {
      depletionMonth = m;
      pushSnapshot(Math.ceil(m / 12));
      break;
    }

    // 年末（12の倍数の月）ごとに記録を残す
    if (m % 12 === 0) {
      pushSnapshot(m / 12);
    }
  }

  return {
    snapshots,
    depletionMonth,
    totalWithdrawn: Math.round(totalWithdrawn),
    // 枯渇したケースは1円未満の端数を残さず0円として返す
    finalValue: depletionMonth !== null ? 0 : Math.round(value),
    restoredQuotaTotal: Math.round(restoredQuota),
    taxSavedVsTaxable: Math.round(taxSaved),
  };
}
