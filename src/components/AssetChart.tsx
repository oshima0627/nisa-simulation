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

export default function AssetChart({ result }: Props) {
  const data = result.snapshots.map((s) => ({
    label: s.age !== undefined ? `${s.age}歳` : `${s.year}年`,
    元本: s.principal,
    運用益: Math.max(0, s.gain),
  }));

  const capYear =
    result.lifetimeCapReachedMonth && result.lifetimeCapReachedMonth > 0
      ? Math.ceil(result.lifetimeCapReachedMonth / 12)
      : null;
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
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
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
