"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SimulationResult } from "@/lib/simulation/types";
import { formatManYen } from "@/lib/format";

interface Props {
  result: SimulationResult;
}

/**
 * 積立フェーズの資産推移グラフ（元本と運用益の積み上げエリアチャート）。
 *
 * 積み上げにすることで、上端＝評価額、下の層＝自分で入れたお金、
 * 上の層＝増えた分、という内訳が1本のグラフで読み取れる。
 */
export default function AssetChart({ result }: Props) {
  // 年次スナップショットを recharts が読む形に変換する。
  // dataKey にそのまま日本語キーを使い、凡例・ツールチップの表示名を兼ねている
  const data = result.snapshots.map((s) => ({
    // 年齢が計算されていれば「◯歳」、なければ「◯年」をX軸ラベルにする
    label: s.age !== undefined ? `${s.age}歳` : `${s.year}年`,
    元本: s.principal,
    // 元本割れ（マイナス）は積み上げが崩れるので0で下限を切る
    運用益: Math.max(0, s.gain),
  }));

  // 生涯枠に到達した月を年に切り上げる。0（開始時点で到達済み）は線を引かない
  const capYear =
    result.lifetimeCapReachedMonth && result.lifetimeCapReachedMonth > 0
      ? Math.ceil(result.lifetimeCapReachedMonth / 12)
      : null;
  // 到達年がグラフの範囲内にあるときだけ、その年のX軸ラベルを取り出す。
  // recharts の ReferenceLine はラベル値で位置を指定するため
  const capLabel =
    capYear !== null && capYear <= result.snapshots.length
      ? data[capYear - 1]?.label
      : null;

  return (
    <div aria-label="資産推移グラフ" role="img" className="h-64 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#ece9e3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#98938c", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#ece9e3" }}
            // 期間が長いと目盛りが潰れるので間引く。ただし最初と最後は必ず残す
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            // 円のままだと桁が多く読めないため、万円単位に丸めて表示する
            tickFormatter={(v: number) => `${Math.round(v / 10_000).toLocaleString()}万`}
            tick={{ fill: "#98938c", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            formatter={(value, name) => [formatManYen(Number(value ?? 0)), String(name)]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #ece9e3",
              fontSize: 12,
              color: "#3b3734",
            }}
          />
          {/* 生涯枠1,800万円に到達した年に縦の破線を引く。
              以降は積立が止まっており、グラフの傾きが変わる理由の説明になる */}
          {capLabel && (
            <ReferenceLine
              x={capLabel}
              stroke="#f5be8f"
              strokeWidth={2}
              strokeDasharray="4 3"
              label={{
                value: "生涯枠到達",
                fill: "#b9834e",
                fontSize: 11,
                position: "insideTopRight",
              }}
            />
          )}
          {/* 同じ stackId を指定した2つの Area が積み上がり、
              上端が評価額（元本＋運用益）になる */}
          <Area
            type="monotone"
            dataKey="元本"
            stackId="1"
            stroke="#4a7fac"
            fill="#8fc1e4"
            fillOpacity={0.85}
          />
          <Area
            type="monotone"
            dataKey="運用益"
            stackId="1"
            stroke="#2c8c7d"
            fill="#7fcdbb"
            fillOpacity={0.85}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
