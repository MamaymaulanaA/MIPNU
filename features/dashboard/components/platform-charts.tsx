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

/**
 * Grafik dashboard platform.
 *
 * Biru tetap warna utamanya. Aksen lain dipakai untuk satu tugas saja:
 * MEMBEDAKAN kategori yang berdampingan. Donat enam irisan dengan enam
 * kedalaman biru menuntut pembacanya membandingkan kepekatan; enam hue yang
 * berbeda terbaca sekali lihat. Karena itu urutannya tetap: biru primer lebih
 * dulu, selalu, sehingga irisan terbesar tetap berwarna merek.
 *
 * Aksen ini BUKAN status. Merah mawar di sini berarti "kategori keenam", bukan
 * "gagal" — token semantik destructive/warning tidak dipakai di grafik supaya
 * artinya tidak tergerus.
 *
 * Setiap pembungkus grafik diberi `min-w-0 overflow-hidden`. Recharts menulis
 * lebar terukur sebagai gaya sebaris pada pembungkusnya sendiri, dan lebar itu
 * tertinggal sesaat ketika jendela dikecilkan — cukup untuk mendorong lebar
 * halaman sebelum pengukuran berikutnya tiba. Kliping di sini membuat sisa
 * sesaat itu tidak pernah sampai ke tata letak.
 */

const TOOLTIP = {
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  fontSize: 12,
  boxShadow: "none",
};

/* ------------------------------------------------------- pertumbuhan */

export function GrowthChart({ points }: { points: GrowthPoint[] }) {
  return (
    <div className="h-[212px] w-full min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          // Marginnya tidak ditarik ke kiri: label sumbu Y di sini bisa dua
          // angka, dan margin negatif memotong digit pertamanya.
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
          {/* Deret kedua ungu, bukan biru tua: dua biru berdampingan pada
              grafik yang sama menuntut legenda dibaca lebih dulu. */}
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

/* ------------------------------------------------------------- donat */

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

      {/* Angka di tengah donat: yang dicari orang lebih dulu adalah totalnya. */}
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

/* --------------------------------------------------------- sparkline */

/**
 * Garis mini pada kartu metrik.
 *
 * HANYA dipanggil ketika deret bulanannya benar-benar ada. Kartu yang tidak
 * punya riwayat — misalnya jumlah anggota lintas organisasi, yang datang
 * sebagai satu angka agregat — tidak memanggil komponen ini sama sekali, dan
 * ruangnya diisi keterangan nyata, bukan garis karangan.
 */
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
