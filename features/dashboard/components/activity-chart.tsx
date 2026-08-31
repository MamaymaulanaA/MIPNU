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

/**
 * Grafik kegiatan organisasi per bulan.
 *
 * Bentuknya sengaja sama dengan grafik pertumbuhan pada dashboard platform —
 * area biru dengan gradasi, sumbu tanpa garis, label kecil. Dua dashboard yang
 * berbeda isinya tetap satu aplikasi, dan dua gaya grafik yang berbeda pada
 * aplikasi yang sama terbaca sebagai dua produk.
 *
 * Tingginya MINIMAL 160px dan tumbuh mengikuti kartunya. Rincian per sumber
 * kini berdiri di sebelah kanannya, bukan di bawahnya, dan tiga baris itu
 * setinggi 160px — jadi batas bawah grafik disamakan dengan tetangganya dan
 * kartunya berakhir rata tanpa pita putih di salah satu kolom.
 *
 * Batas bawahnya 160px, bukan setinggi grafik platform. Deretnya dua belas titik
 * dari organisasi yang sebagian besar bulannya memang kosong; kotak yang lebih
 * tinggi tidak menambah satu pun informasi, ia hanya menambah ruang kosong.
 *
 * Angkanya dihitung dari baris yang memang ada — agenda, event, dan rapat yang
 * boleh dilihat pemanggil. Organisasi yang baru berjalan akan melihat garis
 * yang sebagian besar mendatar di nol, dan itu memang keadaannya; grafik ini
 * tidak dihaluskan, tidak diberi data contoh, dan tidak diberi tren buatan
 * supaya terlihat ramai.
 */
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
            // Tanpa data, sumbu tetap 0-1 supaya garis nol punya tempat berdiri
            // alih-alih menempel pada tepi kotak.
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
