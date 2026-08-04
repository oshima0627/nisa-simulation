"use client";

import {
  MAX_MONTHLY_AMOUNT,
  MAX_RETURN_PCT,
  MAX_YEARS,
  MIN_MONTHLY_AMOUNT,
  WARN_RETURN_PCT,
} from "@/constants/nisa";

/**
 * 入力フォームの状態。
 *
 * 計算エンジンの `SimulationInput` とは意図的に形が違う:
 * - 未設定を undefined ではなく 0（年齢のみ空文字）で表す
 *   → `<input value>` が undefined になると制御コンポーネントでなくなるため
 * - ボーナスは配列ではなく1回目・2回目の平坦なフィールドで持つ
 *   → 入力欄と1対1で対応させ、配列の要素追加・削除を扱わずに済ませるため
 * 変換は Simulator の formToInput / inputToForm が担当する。
 */
export interface FormState {
  /** 毎月の積立額（円） */
  monthlyAmount: number;
  /** 想定利回り（年率%） */
  annualReturnPct: number;
  /** 積立期間（年） */
  years: number;
  /** 現在のNISA評価額（円）。0 = 未入力 */
  currentValue: number;
  /** 消化済みつみたて投資枠（簿価、円）。0 = 未入力 */
  usedTsumitateQuota: number;
  /** 消化済み成長投資枠（簿価、円）。0 = 未入力 */
  usedGrowthQuota: number;
  /** ボーナス1回目の月（1〜12）。0 = なし */
  bonus1Month: number;
  /** ボーナス1回目の増額（円） */
  bonus1Amount: number;
  /** ボーナス2回目の月（1〜12）。0 = なし */
  bonus2Month: number;
  /** ボーナス2回目の増額（円） */
  bonus2Amount: number;
  /** 現在年齢。空文字 = 未入力（0歳と区別する必要があるため数値で持たない） */
  currentAge: number | "";
  /** 信託報酬（年率%）。0 = 考慮しない */
  feePct: number;
  /** 想定インフレ率（年率%）。0 = 考慮しない */
  inflationPct: number;
}

interface Props {
  /** 現在の入力値。状態は親（Simulator）が持つ制御コンポーネント */
  form: FormState;
  /** 詳細設定を開いているか */
  detailed: boolean;
  /** 変更のあったフィールドだけを親へ通知する（親側でマージする） */
  onChange: (next: Partial<FormState>) => void;
  onToggleDetailed: (detailed: boolean) => void;
}

/** 利回りのワンタッチ入力。保守的3% / 標準5% / 強気7% の目安 */
const RETURN_PRESETS = [3, 5, 7];

/**
 * 「ラベル＋入力欄＋単位＋補足」をひとまとめにする共通レイアウト。
 * 全体を <label> で包んでいるので、ラベル文字のクリックでも入力欄にフォーカスが移る。
 */
function Field({
  label,
  suffix,
  children,
  hint,
}: {
  label: string;
  suffix?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}</span>
      <span className="flex items-center gap-2">
        {children}
        {suffix && <span className="shrink-0 text-sm text-ink-soft">{suffix}</span>}
      </span>
      {hint && <span className="mt-1 block text-[11px] text-ink-soft">{hint}</span>}
    </label>
  );
}

const inputClass =
  "font-num w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink outline-none transition-shadow focus:ring-2 focus:ring-mint";

export default function InputForm({
  form,
  detailed,
  onChange,
  onToggleDetailed,
}: Props) {
  /**
   * 数値入力の onChange ハンドラを作る高階関数。
   * すべての入力欄で同じ処理（数値化 → 範囲内に丸める → 親へ通知）が要るため、
   * キーと範囲を渡すだけでハンドラを生成できるようにしている。
   *
   * `min`/`max` は input要素の min/max 属性とは別に必要。
   * 属性はスピナー操作を制限するだけで、直接入力やペーストは止められないため、
   * ここで実際の値を範囲内に丸める。
   */
  const num =
    (key: keyof FormState, min: number, max: number) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const raw = e.target.value;
      // 年齢だけは「未入力」を空文字のまま保持する（0歳と区別するため）
      if (raw === "" && key === "currentAge") {
        onChange({ currentAge: "" });
        return;
      }
      const value = Number(raw);
      // 数値として解釈できない入力（空文字・記号など）は無視して直前の値を保つ
      if (!Number.isFinite(value)) return;
      onChange({ [key]: Math.min(Math.max(value, min), max) });
    };

  return (
    <div className="space-y-5">
      {/* 基本の3項目。この3つだけで試算が成立するよう常に表示する */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="毎月の積立額"
          suffix="円"
          hint={`${MIN_MONTHLY_AMOUNT.toLocaleString()}円〜${MAX_MONTHLY_AMOUNT.toLocaleString()}円`}
        >
          <input
            type="number"
            inputMode="numeric"
            min={MIN_MONTHLY_AMOUNT}
            max={MAX_MONTHLY_AMOUNT}
            step={1000}
            value={form.monthlyAmount}
            onChange={num("monthlyAmount", 0, MAX_MONTHLY_AMOUNT)}
            className={inputClass}
          />
        </Field>
        <Field
          label="想定利回り（年率）"
          suffix="%"
          // 高すぎる利回りは試算を非現実的にするため、閾値を超えたら注意書きを出す
          hint={
            form.annualReturnPct > WARN_RETURN_PCT
              ? "過去実績と比べて楽観的な水準です"
              : undefined
          }
        >
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={MAX_RETURN_PCT}
            step={0.1}
            value={form.annualReturnPct}
            onChange={num("annualReturnPct", 0, MAX_RETURN_PCT)}
            className={inputClass}
          />
        </Field>
        <Field label="積立期間" suffix="年">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_YEARS}
            value={form.years}
            onChange={num("years", 1, MAX_YEARS)}
            className={inputClass}
          />
        </Field>
      </div>

      {/* 利回りのプリセット。何%が妥当かの判断材料がない人向けの入口 */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-ink-soft">利回りの目安:</span>
        {RETURN_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange({ annualReturnPct: p })}
            className={`font-num rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              form.annualReturnPct === p
                ? "bg-mint-deep text-white"
                : "bg-mint-tint text-mint-text hover:bg-mint/40"
            }`}
          >
            {p}%
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onToggleDetailed(!detailed)}
        aria-expanded={detailed}
        className="text-xs font-medium text-mint-text underline underline-offset-4"
      >
        {detailed ? "詳細設定を閉じる" : "詳細設定（運用中の人向け）を開く"}
      </button>

      {/* 詳細設定。すでに運用中の人が「今の残高の続き」から試算するための欄。
          初見の人には不要なので既定では畳んでおく */}
      {detailed && (
        <div className="space-y-4 rounded-2xl border border-line bg-ivory p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="現在のNISA評価額" suffix="円">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={10000}
                value={form.currentValue}
                onChange={num("currentValue", 0, 1_000_000_000)}
                className={inputClass}
              />
            </Field>
            <Field label="現在年齢（グラフに年齢を表示）" suffix="歳">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                value={form.currentAge}
                onChange={num("currentAge", 0, 120)}
                className={inputClass}
              />
            </Field>
            <Field
              label="消化済みのつみたて投資枠"
              suffix="円"
              hint="これまでに投資した元本（簿価）の合計"
            >
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={18_000_000}
                step={10000}
                value={form.usedTsumitateQuota}
                onChange={num("usedTsumitateQuota", 0, 18_000_000)}
                className={inputClass}
              />
            </Field>
            <Field label="消化済みの成長投資枠" suffix="円">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={12_000_000}
                step={10000}
                value={form.usedGrowthQuota}
                onChange={num("usedGrowthQuota", 0, 12_000_000)}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="信託報酬（年率）"
              suffix="%"
              hint="低コストのインデックスファンドは0.1%前後"
            >
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={5}
                step={0.01}
                value={form.feePct}
                onChange={num("feePct", 0, 5)}
                className={inputClass}
              />
            </Field>
            <Field
              label="想定インフレ率（年率）"
              suffix="%"
              hint="0より大きくすると実質価値（今のお金の価値）でも表示できます"
            >
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={10}
                step={0.1}
                value={form.inflationPct}
                onChange={num("inflationPct", 0, 10)}
                className={inputClass}
              />
            </Field>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-xs font-medium text-ink-soft">
              ボーナス月の増額（成長投資枠として計算・年2回まで）
            </legend>
            {/* 1回目・2回目で同じUIなので、キーの組を配列にして繰り返し描画する。
                `as const` を付けて keyof FormState として型が効くようにしている */}
            {(
              [
                ["bonus1Month", "bonus1Amount"],
                ["bonus2Month", "bonus2Amount"],
              ] as const
            ).map(([monthKey, amountKey], i) => (
              <div key={monthKey} className="flex items-center gap-3">
                <select
                  aria-label={`ボーナス${i + 1}回目の月`}
                  value={form[monthKey]}
                  onChange={num(monthKey, 0, 12)}
                  className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
                >
                  {/* 0 =「なし」。金額欄はこのとき無効化される */}
                  <option value={0}>なし</option>
                  {/* 1月〜12月の選択肢を生成する */}
                  {Array.from({ length: 12 }, (_, m) => (
                    <option key={m + 1} value={m + 1}>
                      {m + 1}月
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  inputMode="numeric"
                  aria-label={`ボーナス${i + 1}回目の増額`}
                  min={0}
                  step={10000}
                  value={form[amountKey]}
                  onChange={num(amountKey, 0, 2_400_000)}
                  disabled={form[monthKey] === 0}
                  className={`${inputClass} disabled:opacity-40`}
                />
                <span className="shrink-0 text-sm text-ink-soft">円</span>
              </div>
            ))}
          </fieldset>
        </div>
      )}
    </div>
  );
}
