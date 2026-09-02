import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import {
  AKSEN,
  WADAH,
  type Aksen,
} from "@/features/dashboard/components/accent";
import { Sparkline } from "@/features/dashboard/components/platform-charts";
import type { StoredGender } from "@/lib/avatar";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Wadah ikon, 32px di seluruh dashboard.
 *
 * Satu ukuran untuk SEMUA wadah ikon: kartu metrik dan kartu kecil berdiri
 * berdekatan pada halaman yang sama, dan dua ukuran wadah membuat keduanya
 * terbaca sebagai dua sistem alih-alih satu bahasa.
 *
 * Angkanya mengikuti tinggi barisnya. Pada baris 48px, wadah 28px memakai 58%
 * tinggi baris; ketika barisnya naik ke 56px, wadah yang sama tinggal 50% dan
 * ikonnya mulai terlihat hanyut di tengah ruang kosong. Pada 32px proporsinya
 * kembali ke 57% — ikon tetap penanda, bukan subjek, dan tidak pula tenggelam.
 *
 * Ukuran ini TIDAK mengikat kotak tanggal. Lihat catatan skala di atas: yang
 * wajib seragam antar panel adalah tinggi barisnya.
 */
export function IconBox({
  icon: Icon,
  tone,
}: {
  icon: LucideIcon;
  tone: Aksen;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-sm",
        WADAH[tone],
      )}
    >
      <Icon size={16} strokeWidth={1.9} />
    </span>
  );
}

export function MetricCard({
  label,
  value,
  description,
  icon,
  tone,
  delta,
  series,
  noteValue,
  noteLabel,
}: {
  label: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  tone: Aksen;
  delta?: number | null;
  series?: number[];
  noteValue?: string;
  noteLabel?: string;
}) {
  const punyaDelta = delta !== null && delta !== undefined && delta !== 0;
  const punyaDeret = Boolean(series && series.length > 1);
  const punyaCatatan = Boolean(noteValue);
  const Panah = (delta ?? 0) > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="h-full rounded-md border border-border bg-card p-3.5 shadow-raised">
      <div className="flex items-center gap-2">
        <IconBox icon={icon} tone={tone} />
        <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-muted-foreground">
          {label}
        </p>
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "truncate leading-none font-semibold tracking-tight text-foreground",
              value.length <= 8
                ? "text-[24px]"
                : value.length <= 12
                  ? "text-[20px]"
                  : "text-[18px]",
            )}
          >
            {value}
          </p>
          {description ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-tight text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {punyaDelta || punyaCatatan || punyaDeret ? (
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            {punyaDelta ? (
              <>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-[11.5px] leading-none font-semibold",
                    (delta ?? 0) > 0 ? "text-primary" : "text-destructive",
                  )}
                >
                  <Panah size={12} aria-hidden="true" />
                  {(delta ?? 0) > 0 ? "+" : ""}
                  {formatNumber(delta ?? 0)}
                </span>
                <span className="text-[10px] leading-none text-muted-foreground">
                  vs bulan lalu
                </span>
              </>
            ) : punyaCatatan ? (
              <span className="inline-flex flex-col items-end rounded-sm bg-muted px-2 py-1">
                <span className="text-[12px] leading-none font-semibold text-foreground">
                  {noteValue}
                </span>
                <span className="mt-0.5 text-[10px] leading-none text-muted-foreground">
                  {noteLabel}
                </span>
              </span>
            ) : null}

            {punyaDeret ? (
              <Sparkline values={series ?? []} tone={tone} />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card shadow-raised",
        className,
      )}
    >
      {/*
        Menumpuk di bawah 640px. Diukur di peramban pada 320px: judul panel
        dan chip aksinya berebut satu baris, dan judulnya sendiri — "Kegiatan
        Organisasi" — ikut terpotong. Judul panel tidak boleh menjadi korban
        elemen pendampingnya.
      */}
      <div className="flex flex-col items-start gap-1 border-b border-border px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0 max-w-full">
          <h2 className="truncate text-[14px] font-semibold text-foreground">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 max-w-full">{action}</div> : null}
      </div>

      <div className={cn("flex-1 px-3.5 py-3", bodyClassName)}>{children}</div>
    </section>
  );
}

export function CountBadge({ value }: { value: number }) {
  return (
    <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11.5px] font-medium text-muted-foreground">
      {formatNumber(value)}
    </span>
  );
}

export function SeeAll({
  href,
}: {
  href: React.ComponentProps<typeof Link>["href"];
}) {
  return (
    <Link
      href={href}
      className="text-[12.5px] font-medium text-primary hover:underline"
    >
      Lihat semua
    </Link>
  );
}

export function ItemList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ul className={cn("grid content-start gap-2", className)}>{children}</ul>
  );
}

export function ListItem({
  leading,
  title,
  meta,
  trailing,
  href,
}: {
  leading?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  href?: React.ComponentProps<typeof Link>["href"];
}) {
  const isi = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] leading-tight font-medium text-foreground">
          {title}
        </p>
        {meta ? (
          <p className="mt-0.5 truncate text-[10.5px] leading-tight text-muted-foreground">
            {meta}
          </p>
        ) : null}
      </div>
      {trailing ? (
        <div className="flex shrink-0 items-center gap-1.5">{trailing}</div>
      ) : null}
    </>
  );

  // `min-h-16` (64px) menyamakan tinggi baris yang PUNYA keterangan dengan
  // yang tidak. Tanpa itu tinggi baris ditentukan oleh ada-tidaknya satu baris
  // teks, dan dua panel bersebelahan berbeda beberapa piksel tanpa satu pun
  // padding yang berbeda. Tinggi baris daftar tidak boleh ditentukan isinya.
  //
  // Angkanya sekaligus menyediakan ruang bagi penanda terbesar — kotak tanggal
  // setinggi 42px. Lihat hitungan border-box di kepala berkas: padding DAN
  // border sama-sama dipotong dari 64px, menyisakan tepat 42px.
  const kelas = cn(
    "flex min-h-16 items-center gap-3 rounded-sm border border-border px-3 py-2.5",
    href &&
      "transition-colors hover:border-primary-border hover:bg-primary-soft",
  );

  return (
    <li className="min-w-0 list-none">
      {href ? (
        <Link href={href} className={kelas}>
          {isi}
        </Link>
      ) : (
        <div className={kelas}>{isi}</div>
      )}
    </li>
  );
}

export function ItemValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[16px] leading-none font-semibold text-foreground">
      {children}
    </span>
  );
}

export const LENCANA_RINGKAS = "px-1.5 text-[10px]";

export const BATAS_PRATINJAU = 3;

export const SLOT_KONTEN = "grid";

export function EmptyNote({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[136px] flex-col items-center justify-center gap-2 py-4 text-center">
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-sm bg-muted text-muted-soft"
      >
        <Icon size={16} strokeWidth={1.9} />
      </span>
      <p className="max-w-[28ch] text-[11.5px] leading-tight text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

export function StatGrid({ cells }: { cells: SummaryRow[] }) {
  return (
    <ItemList className="grid-cols-2">
      {cells.map((cell) => (
        <ListItem
          key={cell.label}
          leading={<IconBox icon={cell.icon} tone={cell.tone} />}
          title={cell.label}
          trailing={<ItemValue>{cell.value}</ItemValue>}
        />
      ))}
    </ItemList>
  );
}

export function ProgressRow({
  label,
  value,
  total,
  caption,
  tone = "blue",
}: {
  label: string;
  value: number;
  total: number;
  caption: string;
  tone?: Aksen;
}) {
  const persen = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="rounded-sm border border-border px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-[12px] leading-tight font-medium text-foreground">
          {label}
        </p>
        <p className="shrink-0 text-[16px] leading-none font-semibold text-foreground">
          {persen}%
        </p>
      </div>
      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full"
          style={{ width: `${persen}%`, background: AKSEN[tone] }}
        />
      </span>
      <p className="mt-1 truncate text-[10.5px] leading-tight text-muted-foreground">
        {caption}
      </p>
    </div>
  );
}

export type SummaryRow = {
  label: string;
  value: string;
  context?: string;
  icon: LucideIcon;
  tone: Aksen;
};

export function SummaryList({ rows }: { rows: SummaryRow[] }) {
  return (
    <ItemList className="sm:grid-cols-2 xl:grid-cols-1">
      {rows.map((row) => (
        <ListItem
          key={row.label}
          leading={<IconBox icon={row.icon} tone={row.tone} />}
          title={row.label}
          meta={row.context}
          trailing={<ItemValue>{row.value}</ItemValue>}
        />
      ))}
    </ItemList>
  );
}

export type PersonPreview = {
  id: string;
  name: string;
  gender?: StoredGender;
  flagged?: boolean;
};

export function PersonGrid({
  people,
  align = "stretch",
}: {
  people: PersonPreview[];
  align?: "stretch" | "center";
}) {
  return (
    <ul
      className={cn(
        "grid h-full content-center gap-x-2 gap-y-3",
        align === "center"
          ? "grid-cols-[repeat(auto-fill,64px)] justify-center"
          : "grid-cols-[repeat(auto-fill,minmax(64px,1fr))]",
      )}
    >
      {people.map((person) => (
        <li
          key={person.id}
          className="flex min-w-0 flex-col items-center gap-1.5"
        >
          <span className="relative">
            <Avatar
              identity={person.id}
              gender={person.gender}
              size="md"
              className="border-border"
            />
            {person.flagged ? (
              <span
                aria-hidden="true"
                title="Tidak aktif"
                className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-card bg-accent-amber"
              />
            ) : null}
          </span>
          <span className="w-full truncate text-center text-[10.5px] text-muted-foreground">
            {person.name}
          </span>
        </li>
      ))}
    </ul>
  );
}
