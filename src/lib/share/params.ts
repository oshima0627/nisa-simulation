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
 *       f=信託報酬%, i=インフレ率%,
 *       wm=取り崩し方式(f/r), wa=取り崩し月額, wr=取り崩し率%, wd=据置年数
 */

/** 取り崩しタブの設定 */
export interface WithdrawConfig {
  /** 積立終了後の据置期間（年） */
  deferYears: number;
  /** 取り崩し方式 */
  method: "fixed" | "rate";
  /** 定額方式: 毎月の取り崩し額（円） */
  monthlyAmount: number;
  /** 定率方式: 年間の取り崩し率（%） */
  annualRatePct: number;
}

/** 共有対象の状態。表示用設定もURLで再現できるよう含める */
export type ShareableInput = SimulationInput & {
  inflationPct?: number;
  withdraw?: WithdrawConfig;
};

/** 値を min〜max の範囲に収める */
const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

/**
 * URLパラメータから数値を1つ読む。
 * URLは誰でも手で書き換えられるため、ここが唯一の防波堤になる:
 * 未指定・数値でない・NaN/Infinity はすべて undefined にし、
 * 数値として読めた場合も min〜max に丸めてから返す。
 */
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

/** シミュレーション条件 → URLクエリパラメータ */
export function inputToParams(input: ShareableInput): URLSearchParams {
  const params = new URLSearchParams();
  // 必須3項目は常に出力する（この3つが揃っていないURLは復元できない）
  params.set("m", String(input.monthlyAmount));
  params.set("r", String(input.annualReturnPct));
  params.set("y", String(input.years));
  // 任意項目は「未設定または0」のとき省略し、URLを短く保つ
  if (input.feeAnnualPct) params.set("f", String(input.feeAnnualPct));
  if (input.inflationPct) params.set("i", String(input.inflationPct));
  if (input.currentValue) params.set("cv", String(input.currentValue));
  if (input.usedTsumitateQuota) params.set("ut", String(input.usedTsumitateQuota));
  if (input.usedGrowthQuota) params.set("ug", String(input.usedGrowthQuota));
  // ボーナスは年2回まで。金額0の設定はURLに載せない
  input.bonusAdditions?.slice(0, 2).forEach((b, i) => {
    if (b.amount > 0) {
      params.set(`b${i + 1}m`, String(b.month));
      params.set(`b${i + 1}a`, String(b.amount));
    }
  });
  if (input.currentAge) params.set("age", String(input.currentAge));
  // 取り崩し設定は、方式に応じて必要なキーだけを出す
  // （定額なら wa、定率なら wr。使わないほうはURLに含めない）
  if (input.withdraw) {
    params.set("wm", input.withdraw.method === "rate" ? "r" : "f");
    if (input.withdraw.deferYears) params.set("wd", String(input.withdraw.deferYears));
    if (input.withdraw.method === "fixed") {
      params.set("wa", String(input.withdraw.monthlyAmount));
    } else {
      params.set("wr", String(input.withdraw.annualRatePct));
    }
  }
  return params;
}

/**
 * URLクエリパラメータ → シミュレーション条件。
 * 必須キー（m/r/y）が欠けている・壊れている場合は null を返し、
 * 呼び出し側（Simulator）はデフォルト値やlocalStorageにフォールバックする。
 */
export function paramsToInput(params: URLSearchParams): ShareableInput | null {
  const monthlyAmount = readNumber(params, "m", 0, MAX_MONTHLY_AMOUNT);
  const annualReturnPct = readNumber(params, "r", 0, MAX_RETURN_PCT);
  const years = readNumber(params, "y", 1, MAX_YEARS);
  // 3つのうち1つでも読めなければ「共有URLではない」と判断する
  if (
    monthlyAmount === undefined ||
    annualReturnPct === undefined ||
    years === undefined
  ) {
    return null;
  }

  // ボーナス設定を b1m/b1a、b2m/b2a の2組ぶん読む。
  // 月と金額が揃っていて、かつ金額が正のものだけを有効な設定として採用する
  const bonusAdditions: SimulationInput["bonusAdditions"] = [];
  for (const i of [1, 2]) {
    const month = readNumber(params, `b${i}m`, 1, 12);
    const amount = readNumber(params, `b${i}a`, 0, 10_000_000);
    if (month !== undefined && amount !== undefined && amount > 0) {
      // 月は「3.5月」のような小数を弾くため整数に丸める
      bonusAdditions.push({ month: Math.round(month), amount });
    }
  }

  // 取り崩し設定は wm（方式）が正しい値のときだけ復元する。
  // wm があること自体が「取り崩しタブを開いた状態で共有された」印になる
  const wm = params.get("wm");
  const withdraw: ShareableInput["withdraw"] =
    wm === "f" || wm === "r"
      ? {
          method: wm === "r" ? "rate" : "fixed",
          // 使わないほうの方式の値もフォームの初期値として必要なので、
          // URLに無ければ既定値（月10万円 / 年4%）で埋めておく
          deferYears: Math.round(readNumber(params, "wd", 0, 50) ?? 0),
          monthlyAmount: readNumber(params, "wa", 0, 10_000_000) ?? 100_000,
          annualRatePct: readNumber(params, "wr", 0, 100) ?? 4,
        }
      : undefined;

  return {
    monthlyAmount,
    annualReturnPct,
    // 積立期間は整数年しか扱わないので丸める
    years: Math.round(years),
    withdraw,
    feeAnnualPct: readNumber(params, "f", 0, 5),
    inflationPct: readNumber(params, "i", 0, 10),
    currentValue: readNumber(params, "cv", 0, 1_000_000_000),
    usedTsumitateQuota: readNumber(params, "ut", 0, 18_000_000),
    usedGrowthQuota: readNumber(params, "ug", 0, 12_000_000),
    bonusAdditions: bonusAdditions.length > 0 ? bonusAdditions : undefined,
    currentAge: readNumber(params, "age", 0, 120),
  };
}
