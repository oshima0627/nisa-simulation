"use client";

import { useMemo } from "react";
import { formatManYen } from "@/lib/format";
import { simulateAccumulation } from "@/lib/simulation/accumulate";
import { simulateWithdrawal } from "@/lib/simulation/withdraw";
import type { SimulationResult } from "@/lib/simulation/types";
import type { ShareableInput, WithdrawConfig } from "@/lib/share/params";
import LifecycleChart, { type LifecyclePoint } from "./LifecycleChart";

interface Props {
  /** 積立フェーズの入力（積立タブと共有） */
  input: ShareableInput;
  /** 積立フェーズの結果 */
  accResult: SimulationResult;
  config: WithdrawConfig;
  onChange: (next: Partial<WithdrawConfig>) => void;
}

const inputClass =
  "font-num w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink outline-none transition-shadow focus:ring-2 focus:ring-mint";

const WITHDRAW_MAX_YEARS = 50;

export default function WithdrawPanel({ input, accResult, config, onChange }: Props) {
  // 据置フェーズ: 積立なしで運用のみ続ける（積立エンジンを流用）
  const deferResult = useMemo(() => {
    if (config.deferYears <= 0) return null;
    return simulateAccumulation({
      monthlyAmount: 0,
      annualReturnPct: input.annualReturnPct,
      feeAnnualPct: input.feeAnnualPct,
      years: config.deferYears,
      currentValue: accResult.finalValue,
      usedTsumitateQuota: accResult.tsumitateUsed,
      usedGrowthQuota: accResult.growthUsed,
    });
  }, [config.deferYears, input.annualReturnPct, input.feeAnnualPct, accResult]);

  const startValue = deferResult?.finalValue ?? accResult.finalValue;

  const withdrawResult = useMemo(
    () =>
      simulateWithdrawal({
        startValue,
        startBook: accResult.lifetimeUsed,
        annualReturnPct: input.annualReturnPct,
        feeAnnualPct: input.feeAnnualPct,
        method: config.method,
        monthlyAmount: config.monthlyAmount,
        annualRatePct: config.annualRatePct,
        maxYears: WITHDRAW_MAX_YEARS,
      }),
    [startValue, accResult.lifetimeUsed, input.annualReturnPct, input.feeAnnualPct, config],
  );

  // 積立 → 据置 → 取り崩し を1本のタイムラインにつなぐ
  const accYears = input.years;
  const deferYears = config.deferYears;
  const withdrawStartYear = accYears + deferYears + 1;
  const currentAge = input.currentAge;

  const lifecycleData: LifecyclePoint[] = useMemo(() => {
    const label = (year: number) =>
      currentAge !== undefined ? `${currentAge + year}歳` : `${year}年`;
    const points: LifecyclePoint[] = accResult.snapshots.map((s) => ({
      year: s.year,
      label: label(s.year),
      資産額: s.value,
    }));
    deferResult?.snapshots.forEach((s) => {
      points.push({ year: accYears + s.year, label: label(accYears + s.year), 資産額: s.value });
    });
    withdrawResult.snapshots.forEach((s) => {
      const y = accYears + deferYears + s.year;
      points.push({ year: y, label: label(y), 資産額: s.value });
    });
    return points;
  }, [accResult, deferResult, withdrawResult, accYears, deferYears, currentAge]);

  const depletion = withdrawResult.depletionMonth;
  const depletionYears = depletion !== null ? Math.floor(depletion / 12) : null;
  const depletionMonths = depletion !== null ? depletion % 12 : null;
  const depletionAge =
    depletion !== null && currentAge !== undefined
      ? currentAge + accYears + deferYears + Math.ceil(depletion / 12)
      : null;

  return (
    <div className="space-y-6">
      <p className="rounded-xl bg-mint-tint px-4 py-3 text-xs leading-relaxed text-mint-text">
        積立シミュレーションの条件を引き継いでいます: 毎月
        {formatManYen(input.monthlyAmount)} × {accYears}年（年利{input.annualReturnPct}%）→
        取り崩し開始時の資産は約<b>{formatManYen(startValue)}</b>
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-soft">
            据置期間（積立終了後、取り崩しまで運用だけ続ける年数）
          </span>
          <span className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={50}
              value={config.deferYears}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v))
                  onChange({ deferYears: Math.min(Math.max(Math.round(v), 0), 50) });
              }}
              className={inputClass}
            />
            <span className="shrink-0 text-sm text-ink-soft">年</span>
          </span>
        </label>

        <div className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-soft">取り崩し方式</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ method: "fixed" })}
              className={`flex-1 rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${
                config.method === "fixed"
                  ? "border-mint-deep bg-mint-tint text-mint-text"
                  : "border-line text-ink-soft hover:bg-ivory"
              }`}
            >
              定額（毎月◯円）
            </button>
            <button
              type="button"
              onClick={() => onChange({ method: "rate" })}
              className={`flex-1 rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${
                config.method === "rate"
                  ? "border-mint-deep bg-mint-tint text-mint-text"
                  : "border-line text-ink-soft hover:bg-ivory"
              }`}
            >
              定率（年◯%）
            </button>
          </div>
        </div>

        {config.method === "fixed" ? (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">
              毎月の取り崩し額
            </span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={10_000}
                max={10_000_000}
                step={10_000}
                value={config.monthlyAmount}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v))
                    onChange({ monthlyAmount: Math.min(Math.max(v, 0), 10_000_000) });
                }}
                className={inputClass}
              />
              <span className="shrink-0 text-sm text-ink-soft">円</span>
            </span>
          </label>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">
              年間の取り崩し率
            </span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={0.5}
                max={20}
                step={0.5}
                value={config.annualRatePct}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v))
                    onChange({ annualRatePct: Math.min(Math.max(v, 0), 100) });
                }}
                className={inputClass}
              />
              <span className="shrink-0 text-sm text-ink-soft">%</span>
            </span>
          </label>
        )}
      </div>

      <section aria-label="取り崩しシミュレーション結果">
        <p className="text-[13px] text-ink-soft">
          {config.method === "fixed"
            ? `毎月${formatManYen(config.monthlyAmount)}ずつ取り崩すと、資産は`
            : `毎年${config.annualRatePct}%ずつ取り崩すと、資産は`}
        </p>
        <p className="mt-1">
          {depletion !== null ? (
            <>
              <span className="font-num text-4xl font-bold leading-tight text-mint-text">
                約{depletionYears}年{depletionMonths ? `${depletionMonths}ヶ月` : ""}
              </span>
              <span className="font-maru ml-2 text-base font-bold">
                もちます{depletionAge !== null ? `（${depletionAge}歳ごろまで）` : ""}
              </span>
            </>
          ) : (
            <>
              <span className="font-num text-4xl font-bold leading-tight text-mint-text">
                {WITHDRAW_MAX_YEARS}年後
              </span>
              <span className="font-maru ml-2 text-base font-bold">
                も約{formatManYen(withdrawResult.finalValue)}残ります
              </span>
            </>
          )}
        </p>
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-y border-line py-4">
          <div>
            <dt className="text-[11px] tracking-wide text-ink-soft">累計受取額</dt>
            <dd className="font-num text-base font-bold text-mint-text">
              {formatManYen(withdrawResult.totalWithdrawn)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] tracking-wide text-ink-soft">
              取り崩し時の節税効果（課税口座との比較）
            </dt>
            <dd className="font-num text-base font-bold text-mint-text">
              約{formatManYen(withdrawResult.taxSavedVsTaxable)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] tracking-wide text-ink-soft">復活する生涯枠（簿価）</dt>
            <dd className="font-num text-base font-bold text-aqua-text">
              {formatManYen(withdrawResult.restoredQuotaTotal)}
            </dd>
          </div>
        </dl>
      </section>

      <LifecycleChart
        data={lifecycleData}
        deferStartLabel={
          deferYears > 0 ? lifecycleData[accYears - 1]?.label : undefined
        }
        withdrawStartLabel={lifecycleData[withdrawStartYear - 2]?.label}
      />

      <p className="text-[11px] leading-relaxed text-ink-soft">
        ※売却した分の非課税枠（買ったときの金額分）は翌年に復活しますが、
        本シミュレーションでは復活した枠への再投資は行わない前提です。
        ※課税口座との比較は、受取額のうち利益部分に20.315%が課税される簡易モデルです。
      </p>
    </div>
  );
}
