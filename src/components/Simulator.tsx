"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { simulateAccumulation } from "@/lib/simulation/accumulate";
import { adjustForInflation } from "@/lib/simulation/inflation";
import { compareTaxableAccount } from "@/lib/simulation/tax";
import {
  inputToParams,
  paramsToInput,
  type ShareableInput,
  type WithdrawConfig,
} from "@/lib/share/params";
import { formatManYen } from "@/lib/format";
import AssetChart from "./AssetChart";
import InputForm, { type FormState } from "./InputForm";
import QuotaGauge from "./QuotaGauge";
import ResultCard from "./ResultCard";
import ReversePanel from "./ReversePanel";
import ShareButtons from "./ShareButtons";
import WithdrawPanel from "./WithdrawPanel";

/**
 * シミュレーター全体の親コンポーネント。
 *
 * 役割:
 * - 入力フォームの状態（FormState）を1か所で持ち、3つのタブへ配る
 * - 入力が変わるたびに計算エンジンを呼び直し、結果を各表示コンポーネントへ渡す
 * - 条件を localStorage とURLに保存し、再訪・共有時に復元する
 *
 * 計算そのものは `src/lib/simulation/` の純粋関数が担当し、
 * ここでは「いつ計算するか」「結果をどう見せるか」だけを扱う。
 */

/** localStorage の保存キー。形式を変えるときは末尾の v1 を上げる */
const STORAGE_KEY = "nisa-sim-input-v1";

/** 初回表示時の条件。毎月3万円・年利5%・20年を標準ケースとして置いている */
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

/**
 * フォームの状態 → 計算エンジン／共有URLが受け取る形へ変換する。
 * フォームは入力しやすさを優先して平坦な数値の集合（未入力は0）で持つのに対し、
 * 入力型は「未設定なら undefined」を前提にしているため、ここで詰め替える。
 */
function formToInput(form: FormState): ShareableInput {
  // ボーナスは2枠ぶんの平坦なフィールドを配列にまとめ直す。
  // 月が未選択（0）または金額0のものは設定なしとして捨てる
  const bonusAdditions = [
    { month: form.bonus1Month, amount: form.bonus1Amount },
    { month: form.bonus2Month, amount: form.bonus2Amount },
  ].filter((b) => b.month >= 1 && b.amount > 0);
  return {
    // `|| undefined` で0を落とす。0を渡すと「設定あり・値は0」と区別できないため
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

/**
 * formToInput の逆変換。URLやlocalStorageから復元した条件をフォームに戻す。
 * undefined は入力欄が空になってしまうため、すべて0や空文字に埋め直す。
 */
function inputToForm(input: ShareableInput): FormState {
  // ボーナス配列を1回目・2回目の平坦なフィールドへ展開する
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

/**
 * 詳細設定に1つでも値が入っているか。
 * 復元した条件が詳細設定を使っていた場合、その欄を閉じたままだと
 * 「なぜかデフォルトと結果が違う」状態になるため、自動で開くための判定。
 */
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
  // 入力フォームの全項目
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  // 詳細設定（運用中の人向け）を開いているか
  const [detailed, setDetailed] = useState(false);
  // 表示中のタブ: 積立 / 目標から逆算 / 取り崩し
  const [mode, setMode] = useState<"sim" | "reverse" | "withdraw">("sim");
  // 取り崩しタブの設定。タブを切り替えても値が消えないよう親で保持する
  const [withdrawConfig, setWithdrawConfig] = useState<WithdrawConfig>({
    deferYears: 0,
    method: "fixed",
    monthlyAmount: 100_000,
    annualRatePct: 4,
  });
  // 金額の表示方法: 名目（そのままの額）／実質（インフレ調整後）
  const [display, setDisplay] = useState<"nominal" | "real">("nominal");
  // 共有ボタンに渡す現在の条件入りURL
  const [shareUrl, setShareUrl] = useState("");
  // 復元処理が終わったかどうかのフラグ。
  // 復元前に保存処理が走ると、デフォルト値で保存済みデータを上書きしてしまう
  const hydrated = useRef(false);

  // 初回マウント時: URLパラメータ → localStorage の順で条件を復元する。
  // window/localStorage はSSRでは使えず、レンダー中に読むとhydration不一致に
  // なるため、マウント後のsetStateで一度だけ復元する
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // 共有URLが最優先。他人から受け取ったリンクの条件を、
    // 自分の前回の入力（localStorage）で上書きしてしまわないようにする
    const fromUrl = paramsToInput(new URLSearchParams(window.location.search));
    if (fromUrl) {
      const restored = inputToForm(fromUrl);
      setForm(restored);
      // 詳細設定に値が入っていれば、その欄も開いた状態で見せる
      setDetailed(hasDetailedValues(restored));
      // 取り崩し設定が含まれるURLは、取り崩しタブを開いた状態で共有されたもの
      if (fromUrl.withdraw) {
        setWithdrawConfig(fromUrl.withdraw);
        setMode("withdraw");
      }
    } else {
      // URLに条件がなければ、前回の入力を localStorage から復元する
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
    // ここまで来て初めて保存処理を許可する
    hydrated.current = true;
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // --- 計算。すべて useMemo で包み、無関係な再レンダーでは計算し直さない ---
  // 計算エンジンが受け取る形に詰め替えた入力
  const input = useMemo(() => formToInput(form), [form]);
  // 積立シミュレーションの結果。取り崩しタブの起点にもなるので常に計算しておく
  const result = useMemo(() => simulateAccumulation(input), [input]);
  // 課税口座で同じ運用をした場合との比較（＝節税効果）
  const tax = useMemo(
    () => compareTaxableAccount(result.finalValue, result.totalPrincipal),
    [result],
  );
  // 信託報酬なしとの比較（コストの影響を可視化する）。
  // 同じ条件で信託報酬だけ外して再計算し、最終評価額の差を「コストで失う額」とする
  const feeImpact = useMemo(() => {
    if (!form.feePct) return null;
    const noFee = simulateAccumulation({ ...input, feeAnnualPct: undefined });
    return noFee.finalValue - result.finalValue;
  }, [input, result, form.feePct]);
  // 表示切替: 実質（インフレ調整後）。
  // インフレ率が0のときは切り替えボタン自体を出さないので、常に名目扱いになる
  const showReal = display === "real" && form.inflationPct > 0;
  // 画面表示に使う結果。非課税枠のゲージだけは簿価＝名目で見る必要があるため、
  // インフレ調整後のこの値ではなく、素の `result` を渡している
  const displayResult = useMemo(
    () => (showReal ? adjustForInflation(result, form.inflationPct) : result),
    [showReal, result, form.inflationPct],
  );

  // 入力変更のたびに localStorage と URL（履歴を汚さない replaceState）へ反映。
  // 取り崩しタブを開いている間はその設定もURLに含める
  const shareInput = useMemo(
    () => (mode === "withdraw" ? { ...input, withdraw: withdrawConfig } : input),
    [input, mode, withdrawConfig],
  );
  useEffect(() => {
    // 復元が終わる前に走らせると、デフォルト値で保存データを潰してしまう
    if (!hydrated.current) return;
    const params = inputToParams(shareInput);
    // 共有ボタン用に絶対URLを組み立てる（ハッシュや既存クエリは引き継がない）
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    setShareUrl(url);
    // pushState ではなく replaceState。入力のたびに履歴が増えて
    // 「戻る」が効かなくなるのを避ける
    window.history.replaceState(null, "", `?${params}`);
    try {
      // 保存するのは積立条件のみ。取り崩し設定はURL共有時だけの一時的なもの
      localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
    } catch {
      // ストレージが使えない環境では保存しない
    }
  }, [shareInput, input]);

  /** タブボタンの見た目。選択中は塗りつぶし、非選択はホバーで色が付く */
  const tabClass = (active: boolean) =>
    `font-maru rounded-full px-5 py-2 text-sm font-bold transition-colors ${
      active ? "bg-mint-deep text-white" : "text-ink-soft hover:bg-mint-tint hover:text-mint-text"
    }`;

  return (
    <div className="space-y-6">
      {/* タブ切り替え。role="tablist" でスクリーンリーダーにもタブUIとして伝える */}
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
        <button
          type="button"
          role="tab"
          aria-selected={mode === "withdraw"}
          onClick={() => setMode("withdraw")}
          className={tabClass(mode === "withdraw")}
        >
          取り崩し
        </button>
      </div>

      {/* 取り崩しタブ: 積立タブの入力と計算結果をそのまま引き継いで、
          「貯めたあと」のシミュレーションを行う */}
      {mode === "withdraw" ? (
        <section className="rounded-[1.25rem] border border-line bg-surface p-5 shadow-[0_4px_20px_rgba(59,55,52,0.04)] sm:p-7">
          <h1 className="font-maru mb-5 text-lg font-bold">
            貯めた資産を、どう受け取る？
          </h1>
          <WithdrawPanel
            input={input}
            accResult={result}
            config={withdrawConfig}
            onChange={(next) => setWithdrawConfig((prev) => ({ ...prev, ...next }))}
          />
          <div className="mt-6 border-t border-line pt-6">
            <ShareButtons
              shareUrl={shareUrl}
              finalValue={result.finalValue}
              years={form.years}
            />
          </div>
        </section>
      ) : /* 逆算タブ: 目標額から必要な月額を求める。逆算パネルは独自の入力を
             持つが、信託報酬だけは積立タブの設定に合わせる */
      mode === "reverse" ? (
        <section className="rounded-[1.25rem] border border-line bg-surface p-5 shadow-[0_4px_20px_rgba(59,55,52,0.04)] sm:p-7">
          <h1 className="font-maru mb-5 text-lg font-bold">
            目標額から毎月の積立額をきめる
          </h1>
          <ReversePanel
            feeAnnualPct={form.feePct || undefined}
            // 「この条件でくわしく見る」を押したら、逆算した条件を
            // 積立タブのフォームへ書き戻してタブごと切り替える
            onApply={(monthlyAmount, years, annualReturnPct) => {
              setForm((prev) => ({ ...prev, monthlyAmount, years, annualReturnPct }));
              setMode("sim");
            }}
          />
        </section>
      ) : (
        /* 積立タブ（既定）: 入力フォーム＋結果カード＋グラフ＋枠ゲージ */
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
            {/* 名目／実質の切り替え。インフレ率を設定した人にだけ意味がある操作なので、
                0のときはボタン自体を出さない */}
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
            {/* 数字の前提を注記する。信託報酬やインフレ率を効かせていることが
                結果カードの金額だけからは読み取れないため */}
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
            {/* グラフは表示切替に追従させる（実質表示なら実質の推移） */}
            <div className="mt-6">
              <AssetChart result={displayResult} />
            </div>
            {/* 非課税枠は制度上の簿価で決まる金額なので、インフレ調整前の
                `result` を渡す。ここだけ displayResult ではない */}
            <div className="mt-6 border-t border-line pt-6">
              <QuotaGauge result={result} />
            </div>
            {/* 共有文面の金額も名目で出す（他の人が見たときに制度の数字と揃うため） */}
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
