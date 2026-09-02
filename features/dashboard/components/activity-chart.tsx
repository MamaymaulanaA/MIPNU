"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AKSEN } from "@/features/dashboard/components/accent";
import type { ActivityPoint } from "@/features/dashboard/queries/activity-series";

export function ActivityChart({ points }: { points: ActivityPoint[] }) {
  const maksimum = Math.max(...points.map((p) => p.total), 0);

  return (
    <div className="h-full min-h-[160px] w-full min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="isiKegiatan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={AKSEN.blue} stopOpacity={0.22} />
              <stop offset="100%" stopColor={AKSEN.blue} stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={34}
            allowDecimals={false}
            domain={[0, Math.max(1, maksimum)]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ stroke: "hsl(var(--border))" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
              fontSize: 12,
              boxShadow: "none",
            }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }}
            formatter={(value) => [`${value} kegiatan`, ""]}
            separator=""
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke={AKSEN.blue}
            strokeWidth={2.25}
            fill="url(#isiKegiatan)"
            dot={{ r: 3, fill: AKSEN.blue, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
