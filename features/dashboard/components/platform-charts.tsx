"use client";

import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  AKSEN,
  URUTAN_AKSEN,
  type Aksen,
} from "@/features/dashboard/components/accent";
import type {
  ActivitySlice,
  GrowthPoint,
} from "@/features/dashboard/queries/platform-insight";

const TOOLTIP = {
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  fontSize: 12,
  boxShadow: "none",
};

export function GrowthChart({ points }: { points: GrowthPoint[] }) {
  return (
    <div className="h-[212px] w-full min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="isiPertumbuhan" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0.22}
              />
              <stop
                offset="100%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={34}
            allowDecimals={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ stroke: "hsl(var(--border))" }}
            contentStyle={TOOLTIP}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }}
          />

          <Area
            type="monotone"
            dataKey="organizations"
            name="Organisasi"
            stroke={AKSEN.blue}
            strokeWidth={2.25}
            fill="url(#isiPertumbuhan)"
            dot={{ r: 3, fill: AKSEN.blue, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          <Area
            type="monotone"
            dataKey="accounts"
            name="Akun"
            stroke={AKSEN.purple}
            strokeWidth={2}
            fill="transparent"
            strokeDasharray="5 4"
            dot={{ r: 2.5, fill: AKSEN.purple, strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({
  slices,
  total,
  centerLabel,
  tones = URUTAN_AKSEN,
  height = 180,
}: {
  slices: { label: string; total: number }[];
  total: number;
  centerLabel: string;
  tones?: Aksen[];
  height?: number;
}) {
  return (
    <div className="relative w-full min-w-0 overflow-hidden" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="total"
            nameKey="label"
            innerRadius="63%"
            outerRadius="92%"
            paddingAngle={slices.length > 1 ? 2 : 0}
            strokeWidth={0}
          >
            {slices.map((slice, i) => (
              <Cell
                key={slice.label}
                fill={AKSEN[tones[i % tones.length] ?? "blue"]}
              />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP} />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="text-[22px] leading-none font-semibold text-foreground">
            {total}
          </p>
          <p className="mt-1 text-[10.5px] text-muted-foreground">
            {centerLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DonutLegend({
  slices,
  tones = URUTAN_AKSEN,
}: {
  slices: (ActivitySlice | { label: string; total: number; share: number })[];
  tones?: Aksen[];
}) {
  return (
    <ul className="space-y-0.5">
      {slices.map((slice, i) => (
        <li
          key={slice.label}
          className="flex items-center gap-2 rounded-sm px-1.5 py-1 transition-colors hover:bg-muted"
        >
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            style={{ background: AKSEN[tones[i % tones.length] ?? "blue"] }}
          />
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-foreground">
            {slice.label}
          </span>
          <span className="shrink-0 text-[11.5px] font-semibold text-foreground">
            {slice.total}
          </span>
          <span className="w-8 shrink-0 text-right text-[11px] text-muted-foreground">
            {slice.share}%
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Sparkline({
  values,
  tone = "blue",
}: {
  values: number[];
  tone?: Aksen;
}) {
  const data = values.map((total, i) => ({ i, total }));
  const warna = AKSEN[tone];
  const gradienId = `isiSparkline-${tone}`;

  return (
    <div className="mt-0.5 h-5 w-14 shrink-0 overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={gradienId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={warna} stopOpacity={0.3} />
              <stop offset="100%" stopColor={warna} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="total"
            stroke={warna}
            strokeWidth={1.9}
            fill={`url(#${gradienId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
