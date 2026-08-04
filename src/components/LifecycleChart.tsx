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
import { formatManYen } from "@/lib/format";

export interface LifecyclePoint {
  /** 通算経過年数（1始まり） */
  year: number;
  /** X軸ラベル（「◯年」または「◯歳」） */
  label: string;
  /** 年末の資産評価額（円） */
  資産額: number;
}

interface Props {
  data: LifecyclePoint[];
  /** 取り崩し開始年のラベル */
  withdrawStartLabel?: string;
  /** 据置開始年のラベル（据置期間がある場合） */
  deferStartLabel?: string;
}

/**
 * 生涯の資産推移グラフ（積立 → 据置 → 取り崩し）。
 *
 * AssetChart と違い内訳は分けず、資産額の1本線だけを描く。
 * 山なりに増えて減っていく形と、フェーズの切れ目を示す縦線で、
 * 「いつまでもつのか」を一目で読めるようにするのが狙い。
 * データの連結（フェーズごとの年を通算年へ直す処理）は WithdrawPanel 側で行う。
 */
export default function LifecycleChart({
  data,
  withdrawStartLabel,
  deferStartLabel,
}: Props) {
  return (
    <div aria-label="生涯の資産推移グラフ" role="img" className="h-64 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#ece9e3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#98938c", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#ece9e3" }}
            // 最長100年ぶんの点が並ぶので目盛りは間引く（両端は必ず残す）
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            // 円のままだと桁が多く読めないため、万円単位に丸めて表示する
            tickFormatter={(v: number) => `${Math.round(v / 10_000).toLocaleString()}万`}
            tick={{ fill: "#98938c", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            formatter={(value) => [formatManYen(Number(value ?? 0)), "資産額"]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #ece9e3",
              fontSize: 12,
              color: "#3b3734",
            }}
          />
          {/* 積立が終わる位置の縦線。据置期間があるときだけ引く
              （据置0年なら積立終了＝取り崩し開始で線が重なるため） */}
          {deferStartLabel && (
            <ReferenceLine
              x={deferStartLabel}
              stroke="#8fc1e4"
              strokeWidth={2}
              strokeDasharray="4 3"
              label={{
                value: "積立終了",
                fill: "#4a7fac",
                fontSize: 11,
                position: "insideTopLeft",
              }}
            />
          )}
          {/* 取り崩しが始まる位置の縦線。ここから資産が減少に転じる */}
          {withdrawStartLabel && (
            <ReferenceLine
              x={withdrawStartLabel}
              stroke="#f5be8f"
              strokeWidth={2}
              strokeDasharray="4 3"
              label={{
                value: "取り崩し開始",
                fill: "#b9834e",
                fontSize: 11,
                position: "insideTopRight",
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="資産額"
            stroke="#2c8c7d"
            fill="#7fcdbb"
            fillOpacity={0.75}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
