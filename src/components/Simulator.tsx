"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { simulateAccumulation } from "@/lib/simulation/accumulate";
import { compareTaxableAccount } from "@/lib/simulation/tax";
import type { SimulationInput } from "@/lib/simulation/types";
import { inputToParams, paramsToInput } from "@/lib/share/params";
import AssetChart from "./AssetChart";
import InputForm, { type FormState } from "./InputForm";
import QuotaGauge from "./QuotaGauge";
import ResultCard from "./ResultCard";
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
};

function formToInput(form: FormState): SimulationInput {
  const bonusAdditions = [
    { month: form.bonus1Month, amount: form.bonus1Amount },
    { month: form.bonus2Month, amount: form.bonus2Amount },
  ].filter((b) => b.month >= 1 && b.amount > 0);
  return {
    monthlyAmount: form.monthlyAmount,
    annualReturnPct: form.annualReturnPct,
    years: form.years,
    currentValue: form.currentValue || undefined,
    usedTsumitateQuota: form.usedTsumitateQuota || undefined,
    usedGrowthQuota: form.usedGrowthQuota || undefined,
    bonusAdditions: bonusAdditions.length > 0 ? bonusAdditions : undefined,
    currentAge: form.currentAge === "" ? undefined : form.currentAge,
  };
}

function inputToForm(input: SimulationInput): FormState {
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
  };
}

function hasDetailedValues(form: FormState): boolean {
  return (
    form.currentValue > 0 ||
    form.usedTsumitateQuota > 0 ||
    form.usedGrowthQuota > 0 ||
    form.bonus1Amount > 0 ||
    form.bonus2Amount > 0 ||
    form.currentAge !== ""
  );
}

export default function Simulator() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [detailed, setDetailed] = useState(false);
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
          const restored = inputToForm(JSON.parse(saved) as SimulationInput);
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

  return (
    <div className="space-y-6">
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
        <ResultCard
          result={result}
          tax={tax}
          years={form.years}
          monthlyAmount={form.monthlyAmount}
          annualReturnPct={form.annualReturnPct}
        />
        <div className="mt-6">
          <AssetChart result={result} />
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
    </div>
  );
}
