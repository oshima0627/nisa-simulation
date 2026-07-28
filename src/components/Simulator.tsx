"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { simulateAccumulation } from "@/lib/simulation/accumulate";
import { adjustForInflation } from "@/lib/simulation/inflation";
import { compareTaxableAccount } from "@/lib/simulation/tax";
import {
  inputToParams,
  paramsToInput,
  type ShareableInput,
} from "@/lib/share/params";
import { formatManYen } from "@/lib/format";
import AssetChart from "./AssetChart";
import InputForm, { type FormState } from "./InputForm";
import QuotaGauge from "./QuotaGauge";
import ResultCard from "./ResultCard";
import ReversePanel from "./ReversePanel";
import ShareButtons from "./ShareButtons";

const STORAGE_KEY = "nisa-sim-input-v1";

const DEFAULT_FORM: FormState = {
  monthlyAmount: 30_000,
  annualReturnPct: 5,
  years: 20,
  currentValue: 0,
  usedTsumitateQuota: 0,
  usedGrowthQuota: 0,
  bonus1Month: 0,
  bonus1Amount: 0,
  bonus2Month: 0,
  bonus2Amount: 0,
  currentAge: "",
  feePct: 0,
  inflationPct: 0,
};

function formToInput(form: FormState): ShareableInput {
  const bonusAdditions = [
    { month: form.bonus1Month, amount: form.bonus1Amount },
    { month: form.bonus2Month, amount: form.bonus2Amount },
  ].filter((b) => b.month >= 1 && b.amount > 0);
  return {
    monthlyAmount: form.monthlyAmount,
    annualReturnPct: form.annualReturnPct,
    years: form.years,
    feeAnnualPct: form.feePct || undefined,
    inflationPct: form.inflationPct || undefined,
    currentValue: form.currentValue || undefined,
    usedTsumitateQuota: form.usedTsumitateQuota || undefined,
    usedGrowthQuota: form.usedGrowthQuota || undefined,
    bonusAdditions: bonusAdditions.length > 0 ? bonusAdditions : undefined,
    currentAge: form.currentAge === "" ? undefined : form.currentAge,
  };
}

function inputToForm(input: ShareableInput): FormState {
  const [b1, b2] = input.bonusAdditions ?? [];
  return {
    monthlyAmount: input.monthlyAmount,
    annualReturnPct: input.annualReturnPct,
    years: input.years,
    currentValue: input.currentValue ?? 0,
    usedTsumitateQuota: input.usedTsumitateQuota ?? 0,
    usedGrowthQuota: input.usedGrowthQuota ?? 0,
    bonus1Month: b1?.month ?? 0,
    bonus1Amount: b1?.amount ?? 0,
    bonus2Month: b2?.month ?? 0,
    bonus2Amount: b2?.amount ?? 0,
    currentAge: input.currentAge ?? "",
    feePct: input.feeAnnualPct ?? 0,
    inflationPct: input.inflationPct ?? 0,
  };
}

function hasDetailedValues(form: FormState): boolean {
  return (
    form.currentValue > 0 ||
    form.usedTsumitateQuota > 0 ||
    form.usedGrowthQuota > 0 ||
    form.bonus1Amount > 0 ||
    form.bonus2Amount > 0 ||
    form.currentAge !== "" ||
    form.feePct > 0 ||
    form.inflationPct > 0
  );
}

export default function Simulator() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [detailed, setDetailed] = useState(false);
  const [mode, setMode] = useState<"sim" | "reverse">("sim");
  const [display, setDisplay] = useState<"nominal" | "real">("nominal");
  const [shareUrl, setShareUrl] = useState("");
  const hydrated = useRef(false);

  // 初回マウント時: URLパラメータ → localStorage の順で条件を復元する。
  // window/localStorage はSSRでは使えず、レンダー中に読むとhydration不一致に
  // なるため、マウント後のsetStateで一度だけ復元する
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const fromUrl = paramsToInput(new URLSearchParams(window.location.search));
    if (fromUrl) {
      const restored = inputToForm(fromUrl);
      setForm(restored);
      setDetailed(hasDetailedValues(restored));
    } else {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const restored = inputToForm(JSON.parse(saved) as ShareableInput);
          setForm(restored);
          setDetailed(hasDetailedValues(restored));
        }
      } catch {
        // 壊れた保存データは無視してデフォルトを使う
      }
    }
    hydrated.current = true;
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const input = useMemo(() => formToInput(form), [form]);
  const result = useMemo(() => simulateAccumulation(input), [input]);
  const tax = useMemo(
    () => compareTaxableAccount(result.finalValue, result.totalPrincipal),
    [result],
  );
  // 信託報酬なしとの比較（コストの影響を可視化する）
  const feeImpact = useMemo(() => {
    if (!form.feePct) return null;
    const noFee = simulateAccumulation({ ...input, feeAnnualPct: undefined });
    return noFee.finalValue - result.finalValue;
  }, [input, result, form.feePct]);
  // 表示切替: 実質（インフレ調整後）
  const showReal = display === "real" && form.inflationPct > 0;
  const displayResult = useMemo(
    () => (showReal ? adjustForInflation(result, form.inflationPct) : result),
    [showReal, result, form.inflationPct],
  );

  // 入力変更のたびに localStorage と URL（履歴を汚さない replaceState）へ反映
  useEffect(() => {
    if (!hydrated.current) return;
    const params = inputToParams(input);
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    setShareUrl(url);
    window.history.replaceState(null, "", `?${params}`);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
    } catch {
      // ストレージが使えない環境では保存しない
    }
  }, [input]);

  const tabClass = (active: boolean) =>
    `font-maru rounded-full px-5 py-2 text-sm font-bold transition-colors ${
      active ? "bg-mint-deep text-white" : "text-ink-soft hover:bg-mint-tint hover:text-mint-text"
    }`;

  return (
    <div className="space-y-6">
      <div className="flex gap-2" role="tablist" aria-label="シミュレーションの種類">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "sim"}
          onClick={() => setMode("sim")}
          className={tabClass(mode === "sim")}
        >
          積立シミュレーション
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "reverse"}
          onClick={() => setMode("reverse")}
          className={tabClass(mode === "reverse")}
        >
          目標から逆算
        </button>
      </div>

      {mode === "reverse" ? (
        <section className="rounded-[1.25rem] border border-line bg-surface p-5 shadow-[0_4px_20px_rgba(59,55,52,0.04)] sm:p-7">
          <h1 className="font-maru mb-5 text-lg font-bold">
            目標額から毎月の積立額をきめる
          </h1>
          <ReversePanel
            feeAnnualPct={form.feePct || undefined}
            onApply={(monthlyAmount, years, annualReturnPct) => {
              setForm((prev) => ({ ...prev, monthlyAmount, years, annualReturnPct }));
              setMode("sim");
            }}
          />
        </section>
      ) : (
        <>
          <section className="rounded-[1.25rem] border border-line bg-surface p-5 shadow-[0_4px_20px_rgba(59,55,52,0.04)] sm:p-7">
            <h1 className="font-maru mb-5 text-lg font-bold">
              いくら積み立てる？をきめるだけ
            </h1>
            <InputForm
              form={form}
              detailed={detailed}
              onChange={(next) => setForm((prev) => ({ ...prev, ...next }))}
              onToggleDetailed={setDetailed}
            />
          </section>

          <section className="rounded-[1.25rem] border border-line bg-surface p-5 shadow-[0_4px_20px_rgba(59,55,52,0.04)] sm:p-7">
            {form.inflationPct > 0 && (
              <div className="mb-5 flex items-center gap-2">
                <span className="text-[11px] text-ink-soft">表示:</span>
                <button
                  type="button"
                  onClick={() => setDisplay("nominal")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    !showReal ? "bg-mint-deep text-white" : "bg-mint-tint text-mint-text"
                  }`}
                >
                  名目
                </button>
                <button
                  type="button"
                  onClick={() => setDisplay("real")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    showReal ? "bg-mint-deep text-white" : "bg-mint-tint text-mint-text"
                  }`}
                >
                  実質（今のお金の価値）
                </button>
              </div>
            )}
            <ResultCard
              result={displayResult}
              tax={tax}
              years={form.years}
              monthlyAmount={form.monthlyAmount}
              annualReturnPct={form.annualReturnPct}
              isReal={showReal}
            />
            {(feeImpact !== null || showReal) && (
              <div className="mt-3 space-y-1 text-[11px] leading-relaxed text-ink-soft">
                {feeImpact !== null && (
                  <p>
                    ※信託報酬{form.feePct}%を差し引いて計算しています（コストなしの場合との差:
                    約{formatManYen(feeImpact)}）。
                  </p>
                )}
                {showReal && (
                  <p>
                    ※インフレ率{form.inflationPct}%で割り引いた実質価値（今のお金の価値）で表示しています。
                  </p>
                )}
              </div>
            )}
            <div className="mt-6">
              <AssetChart result={displayResult} />
            </div>
            <div className="mt-6 border-t border-line pt-6">
              <QuotaGauge result={result} />
            </div>
            <div className="mt-6 border-t border-line pt-6">
              <ShareButtons
                shareUrl={shareUrl}
                finalValue={result.finalValue}
                years={form.years}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
