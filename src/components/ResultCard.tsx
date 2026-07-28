import type { SimulationResult } from "@/lib/simulation/types";
import type { TaxComparison } from "@/lib/simulation/tax";
import { formatManYen } from "@/lib/format";

interface Props {
  result: SimulationResult;
  tax: TaxComparison;
  years: number;
  monthlyAmount: number;
  annualReturnPct: number;
}

export default function ResultCard({
  result,
  tax,
  years,
  monthlyAmount,
  annualReturnPct,
}: Props) {
  return (
    <section aria-label="シミュレーション結果">
      <p className="text-[13px] text-ink-soft">
        毎月{formatManYen(monthlyAmount)} × {years}年（年利{annualReturnPct}%）で、あなたの資産は
      </p>
      <p className="mt-1">
        <span className="font-num text-5xl font-bold leading-tight text-mint-text">
          {Math.round(result.finalValue / 10_000).toLocaleString("ja-JP")}
        </span>
        <span className="font-maru ml-1 text-lg font-bold">万円</span>
      </p>
      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-y border-line py-4">
        <div>
          <dt className="text-[11px] tracking-wide text-ink-soft">投資元本</dt>
          <dd className="font-num text-base font-bold text-aqua-text">
            {formatManYen(result.totalPrincipal)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] tracking-wide text-ink-soft">運用益</dt>
          <dd className="font-num text-base font-bold text-mint-text">
            {result.totalGain >= 0 ? "+" : ""}
            {formatManYen(result.totalGain)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] tracking-wide text-ink-soft">
            節税効果（課税口座との比較）
          </dt>
          <dd className="font-num text-base font-bold text-mint-text">
            約{formatManYen(tax.nisaBenefit)}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        ※本シミュレーションは概算であり、将来の運用成果を保証するものではありません。
        課税口座の税率は20.315%として計算しています。
      </p>
    </section>
  );
}
