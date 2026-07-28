"use client";

import { useMemo, useState } from "react";
import { MAX_RETURN_PCT, MAX_YEARS } from "@/constants/nisa";
import { formatManYen } from "@/lib/format";
import { reverseFromTarget } from "@/lib/simulation/reverse";

interface Props {
  /** 積立シミュレーション側に条件を反映する */
  onApply: (monthlyAmount: number, years: number, annualReturnPct: number) => void;
  feeAnnualPct?: number;
}

const inputClass =
  "font-num w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink outline-none transition-shadow focus:ring-2 focus:ring-mint";

export default function ReversePanel({ onApply, feeAnnualPct }: Props) {
  const [targetMan, setTargetMan] = useState(2000); // 万円
  const [years, setYears] = useState(20);
  const [annualReturnPct, setAnnualReturnPct] = useState(5);

  const result = useMemo(
    () =>
      reverseFromTarget({
        targetAmount: targetMan * 10_000,
        years,
        annualReturnPct,
        feeAnnualPct,
      }),
    [targetMan, years, annualReturnPct, feeAnnualPct],
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-soft">目標金額</span>
          <span className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={100}
              max={100_000}
              step={100}
              value={targetMan}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) setTargetMan(Math.min(Math.max(v, 0), 100_000));
              }}
              className={inputClass}
            />
            <span className="shrink-0 text-sm text-ink-soft">万円</span>
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-soft">期間</span>
          <span className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_YEARS}
              value={years}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) setYears(Math.min(Math.max(Math.round(v), 1), MAX_YEARS));
              }}
              className={inputClass}
            />
            <span className="shrink-0 text-sm text-ink-soft">年</span>
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-soft">
            想定利回り（年率）
          </span>
          <span className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={MAX_RETURN_PCT}
              step={0.1}
              value={annualReturnPct}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v))
                  setAnnualReturnPct(Math.min(Math.max(v, 0), MAX_RETURN_PCT));
              }}
              className={inputClass}
            />
            <span className="shrink-0 text-sm text-ink-soft">%</span>
          </span>
        </label>
      </div>

      {result.achievable && result.requiredMonthly !== null ? (
        <div className="rounded-2xl bg-mint-tint px-5 py-5">
          <p className="text-[13px] text-mint-text">
            {targetMan.toLocaleString("ja-JP")}万円を{years}年でめざすなら、毎月
          </p>
          <p className="mt-1">
            <span className="font-num text-4xl font-bold text-mint-text">
              {result.requiredMonthly.toLocaleString("ja-JP")}
            </span>
            <span className="font-maru ml-1 text-base font-bold text-mint-text">円</span>
          </p>
          <p className="mt-2 text-xs text-ink-soft">
            この場合の最終評価額は約{formatManYen(result.finalValue ?? 0)}
            （非課税枠の上限を考慮した試算）
          </p>
          <button
            type="button"
            onClick={() => onApply(result.requiredMonthly!, years, annualReturnPct)}
            className="font-maru mt-4 rounded-full bg-mint-deep px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            この条件でくわしく見る
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#fdf1e8] px-5 py-5 text-sm leading-relaxed text-[#a06a3a]">
          {result.minYears !== null ? (
            <>
              月30万円（年間投資枠の上限）でも{years}年では届きません。
              毎月30万円なら<b>約{result.minYears}年</b>で到達できる計算です。
            </>
          ) : (
            <>
              非課税枠の範囲（毎月30万円・生涯1,800万円）では、50年かけてもこの目標には届かない計算です。
              目標金額か利回りを見直してみてください。
            </>
          )}
        </div>
      )}
    </div>
  );
}
