import { GROWTH_LIFETIME_LIMIT, LIFETIME_LIMIT } from "@/constants/nisa";
import { formatManYen, formatMonthOrdinal } from "@/lib/format";
import type { SimulationResult } from "@/lib/simulation/types";

interface Props {
  result: SimulationResult;
}

function Gauge({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-xs text-ink-soft">
        <span>{label}</span>
        <span>
          <b className="font-num text-sm text-ink">{formatManYen(used)}</b>
          <span className="font-num">
            {" "}
            / {formatManYen(limit)}（{Math.round(pct)}%）
          </span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2.5 overflow-hidden rounded-full bg-mint-tint"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-aqua to-mint transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function QuotaGauge({ result }: Props) {
  return (
    <section aria-label="非課税枠の消化状況" className="space-y-4">
      <h2 className="font-maru text-sm font-bold">非課税枠の使いみち</h2>
      <Gauge
        label="生涯非課税枠（合計）"
        used={result.lifetimeUsed}
        limit={LIFETIME_LIMIT}
      />
      <Gauge
        label="うち成長投資枠"
        used={result.growthUsed}
        limit={GROWTH_LIFETIME_LIMIT}
      />
      {result.lifetimeCapReachedMonth !== null &&
        result.lifetimeCapReachedMonth > 0 && (
          <p className="rounded-xl bg-mint-tint px-4 py-3 text-xs leading-relaxed text-mint-text">
            このペースだと
            <b>{formatMonthOrdinal(result.lifetimeCapReachedMonth)}</b>
            に生涯非課税枠1,800万円を使い切ります。以降の積立分は自動的に停止して計算しています。
          </p>
        )}
      {result.uninvestedAmount > 0 && (
        <p className="text-[11px] leading-relaxed text-ink-soft">
          ※枠の上限により、設定した積立額のうち
          {formatManYen(result.uninvestedAmount)}
          は投資されない計算になっています。
        </p>
      )}
    </section>
  );
}
