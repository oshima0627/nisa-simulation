import {
  GROWTH_ANNUAL_LIMIT,
  GROWTH_LIFETIME_LIMIT,
  LIFETIME_LIMIT,
  TSUMITATE_MONTHLY_LIMIT,
} from "@/constants/nisa";
import type { SimulationInput, SimulationResult, YearSnapshot } from "./types";

/**
 * 積立シミュレーション本体。
 *
 * 計算仕様（docs/requirements.md §3）:
 * - 月次複利、月利 = 年率 ÷ 12（金融庁つみたてシミュレーターと同方式）
 * - 積立は毎月末に入金し、翌月から利息が付く（期末払い年金方式）
 * - 毎月の積立はつみたて投資枠（月10万円まで）を優先し、超過分と
 *   ボーナス増額は成長投資枠として扱う
 * - 年間枠（つみたて120万/成長240万）・生涯枠（合計1,800万、
 *   うち成長1,200万）は簿価ベースで管理し、枠が尽きた分は投資されない
 */
export function simulateAccumulation(input: SimulationInput): SimulationResult {
  // 信託報酬は年率から単純控除する簡易方式（docs/requirements.md F6）。
  // 例: 想定利回り5% - 信託報酬0.1% = 実質4.9%で運用したものとして扱う
  const effectiveAnnualPct = input.annualReturnPct - (input.feeAnnualPct ?? 0);
  // 月利 = 実質年率 ÷ 100（%→小数）÷ 12ヶ月。
  // (1+年率)^(1/12)-1 ではなく単純な12分割にしているのは金融庁方式に合わせるため
  const monthlyRate = effectiveAnnualPct / 100 / 12;
  // 以降のループは「年」ではなく「通算月数」で回す
  const totalMonths = input.years * 12;

  // ボーナス設定を「カレンダー月 → 増額合計」の辞書に変換しておく。
  // 毎月のループ内で配列を線形探索せずに済ませるための前処理。
  // 同じ月が2回指定された場合は合算する
  const bonusByMonth = new Map<number, number>();
  for (const b of input.bonusAdditions ?? []) {
    bonusByMonth.set(b.month, (bonusByMonth.get(b.month) ?? 0) + b.amount);
  }

  // --- ループ中に更新していく状態 ---
  // value: 現在の評価額（時価）。詳細モードなら運用中の残高からスタートする
  let value = input.currentValue ?? 0;
  // tsumitateUsed / growthUsed: 枠の消化額。時価ではなく簿価（買った金額）で数える
  let tsumitateUsed = input.usedTsumitateQuota ?? 0;
  let growthUsed = input.usedGrowthQuota ?? 0;
  // 開始時点で既に投じている元本。消化済み枠＝過去に投資した簿価なのでそのまま元本になる
  const initialPrincipal = tsumitateUsed + growthUsed;
  // totalContributed: このシミュレーション期間中に実際に投資できた額の累計
  let totalContributed = 0;
  // uninvestedAmount: 枠が足りず投資に回せなかった額の累計（結果画面の注意書きに使う）
  let uninvestedAmount = 0;
  // lifetimeCapReachedMonth: 生涯枠1,800万円に到達した通算月。未到達なら null のまま
  let lifetimeCapReachedMonth: number | null = null;

  // 初期消化枠だけで既に生涯枠に達しているケース。
  // この場合は「0ヶ月目に到達済み」として記録し、以降の積立は一切通らなくなる
  if (tsumitateUsed + growthUsed >= LIFETIME_LIMIT) {
    lifetimeCapReachedMonth = 0;
  }

  // つみたて枠の年間120万円は毎月上限10万円×12ヶ月で構造的に守られるため、
  // 年間カウンタは成長枠のみ持つ
  let yearGrowth = 0;
  const snapshots: YearSnapshot[] = [];

  // 1ヶ月を1ステップとして「運用 → 積立 → （年末なら記録）」を繰り返す
  for (let m = 1; m <= totalMonths; m++) {
    // 1. 既存資産の運用（月次複利）。
    //    積立より先に運用させることで「その月に入れたお金にはまだ利息が付かない」
    //    期末払い年金方式になる
    value *= 1 + monthlyRate;

    // 2. 月末の積立。つみたて枠優先、超過分＋ボーナスは成長枠
    // 通算月数 m を 1〜12 のカレンダー月に変換する（13ヶ月目 → 1月）
    const calendarMonth = ((m - 1) % 12) + 1;
    // その月がボーナス月なら増額分を取り出す（該当なしは0円）
    const bonus = bonusByMonth.get(calendarMonth) ?? 0;
    // 毎月の積立額のうち、つみたて投資枠に入れたい額（月10万円が上限）
    const wantTsumitate = Math.min(input.monthlyAmount, TSUMITATE_MONTHLY_LIMIT);
    // 月10万円を超えた分とボーナス増額は成長投資枠に回したい額として扱う
    const wantGrowth = input.monthlyAmount - wantTsumitate + bonus;

    // 生涯枠の残り。つみたて枠へ入れた直後に成長枠側でも再評価したいので
    // 変数ではなく関数にして「呼んだ時点の残量」を返すようにしている
    const lifetimeRemaining = () =>
      Math.max(0, LIFETIME_LIMIT - tsumitateUsed - growthUsed);

    // つみたて枠に実際に入る額 = 入れたい額と生涯枠の残りの小さいほう
    const toTsumitate = Math.min(wantTsumitate, lifetimeRemaining());
    tsumitateUsed += toTsumitate;

    // 成長枠に実際に入る額は、4つの制約すべてを同時に満たす必要がある:
    //   1) 入れたい額そのもの
    //   2) 成長枠の年間上限240万円の残り（年末にリセットされる）
    //   3) 成長枠の生涯上限1,200万円の残り
    //   4) 生涯枠1,800万円全体の残り（つみたて枠に入れた直後の値）
    const toGrowth = Math.min(
      wantGrowth,
      Math.max(0, GROWTH_ANNUAL_LIMIT - yearGrowth),
      Math.max(0, GROWTH_LIFETIME_LIMIT - growthUsed),
      lifetimeRemaining(),
    );
    growthUsed += toGrowth;
    yearGrowth += toGrowth;

    // 実際に投資できた額だけを評価額と元本に加える
    const invested = toTsumitate + toGrowth;
    value += invested;
    totalContributed += invested;
    // 入れたかった額と入れられた額の差＝枠不足で投資できなかった分
    uninvestedAmount += wantTsumitate + wantGrowth - invested;

    // 生涯枠に到達した最初の月を記録する（記録済みなら上書きしない）
    if (
      lifetimeCapReachedMonth === null &&
      tsumitateUsed + growthUsed >= LIFETIME_LIMIT
    ) {
      lifetimeCapReachedMonth = m;
    }

    // 3. 年末処理: スナップショット記録と年間枠のリセット
    if (calendarMonth === 12) {
      // 12の倍数の月なので割り切れる。m=12 → 1年目、m=24 → 2年目
      const year = m / 12;
      const principal = initialPrincipal + totalContributed;
      snapshots.push({
        year,
        // 年齢は入力があるときだけ付ける（グラフのX軸ラベル用）
        age: input.currentAge !== undefined ? input.currentAge + year : undefined,
        // 表示は円単位で十分なので、ここで丸めて内部の小数を持ち出さない
        value: Math.round(value),
        principal: Math.round(principal),
        gain: Math.round(value - principal),
        lifetimeUsed: Math.round(tsumitateUsed + growthUsed),
      });
      // 成長枠の年間上限は暦年ごとの制限なので、年が変わるタイミングで0に戻す
      yearGrowth = 0;
    }
  }

  const totalPrincipal = initialPrincipal + totalContributed;
  return {
    snapshots,
    finalValue: Math.round(value),
    totalPrincipal: Math.round(totalPrincipal),
    totalGain: Math.round(value - totalPrincipal),
    lifetimeUsed: Math.round(tsumitateUsed + growthUsed),
    tsumitateUsed: Math.round(tsumitateUsed),
    growthUsed: Math.round(growthUsed),
    lifetimeCapReachedMonth,
    uninvestedAmount: Math.round(uninvestedAmount),
  };
}
