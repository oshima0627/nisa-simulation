"use client";

import {
  MAX_MONTHLY_AMOUNT,
  MAX_RETURN_PCT,
  MAX_YEARS,
  MIN_MONTHLY_AMOUNT,
  WARN_RETURN_PCT,
} from "@/constants/nisa";

export interface FormState {
  monthlyAmount: number;
  annualReturnPct: number;
  years: number;
  currentValue: number;
  usedTsumitateQuota: number;
  usedGrowthQuota: number;
  bonus1Month: number;
  bonus1Amount: number;
  bonus2Month: number;
  bonus2Amount: number;
  currentAge: number | "";
  /** 信託報酬（年率%）。0 = 考慮しない */
  feePct: number;
  /** 想定インフレ率（年率%）。0 = 考慮しない */
  inflationPct: number;
}

interface Props {
  form: FormState;
  detailed: boolean;
  onChange: (next: Partial<FormState>) => void;
  onToggleDetailed: (detailed: boolean) => void;
}

const RETURN_PRESETS = [3, 5, 7];

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
  const num =
    (key: keyof FormState, min: number, max: number) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const raw = e.target.value;
      if (raw === "" && key === "currentAge") {
        onChange({ currentAge: "" });
        return;
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) return;
      onChange({ [key]: Math.min(Math.max(value, min), max) });
    };

  return (
    <div className="space-y-5">
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
                  <option value={0}>なし</option>
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
