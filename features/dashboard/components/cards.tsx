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
 * Bahasa kartu dashboard.
 *
 * Dipakai bersama oleh dashboard platform dan dashboard organisasi. Keduanya
 * menampilkan hal yang sama sekali berbeda, tetapi keduanya adalah dashboard
 * MIPNU — dan sebelum berkas ini ada, setiap kali salah satunya dirapikan yang
 * lain diam-diam tertinggal.
 *
 * Aturannya satu: tinggi kartu mengikuti isinya. Tidak ada `min-height`, tidak
 * ada baris yang berdiri sendiri hanya untuk sebuah chip, dan tidak ada kartu
 * kecil yang dibuat setinggi kartu metrik hanya demi kesejajaran.
 *
 * SKALA JARAK — satu-satunya yang dipakai di seluruh dashboard:
 *
 *   kepala panel   px-3.5 py-2.5 (14 / 10)
 *   badan panel    px-3.5 py-3   (14 / 12)
 *   kartu metrik   p-3.5         (14)
 *   item daftar    px-3 py-2.5   (12 / 10)
 *   tinggi item    min-h-15      (60)
 *   penanda→teks   gap-3         (12)
 *   jarak item     gap-2         (8)
 *   jarak panel    gap-4         (16)
 *   jarak baris    space-y-4     (16)
 *   wadah ikon     size-8        (32)
 *   kotak tanggal  size-9        (36)
 *
 * TINGGI BARIS DAN PENANDANYA — kenapa angkanya seperti itu.
 *
 * Penanda terbesar di dashboard adalah kotak tanggal: 36px, karena isinya tiga
 * baris teks (8 + 13 + 8 = 29px) dan ia tetap perlu ruang di atas serta di
 * bawahnya supaya tidak terbaca sesak. Tinggi barislah yang mengikuti angka
 * itu, bukan sebaliknya.
 *
 * HITUNGANNYA MEMAKAI BORDER-BOX, dan borderlah yang mudah terlewat:
 *
 *   60  tinggi baris (min-h-15)
 *   -20 padding tegak (py-2.5, dua sisi)
 *   -2  border (1px, dua sisi)
 *   ------
 *   38  ruang isi — cukup untuk kotak 36px, dengan 2px sisa
 *
 * Percobaan pertama memakai `min-h-14` (56px) dengan alasan "56 − 2×10 = 36,
 * pas". Itu MELUPAKAN border. Ruang isinya sebenarnya 34px, kotak 36px tidak
 * muat, dan barisnya mengembang sendiri ke 58px — diukur di peramban pada
 * 1440px, dua baris Jadwal berdiri 58px sementara dua belas baris lain di
 * halaman yang sama 56px. Lantai yang tidak memperhitungkan border bukan
 * lantai; ia saran yang diam-diam dilanggar oleh baris yang isinya paling
 * besar.
 *
 * Sebelum semua ini, barisnya 48px dengan padding 8px dan kotak tanggalnya
 * dipatok `size-7` (28px) demi seukuran wadah ikon. Isinya menuntut 31px di
 * dalam 28px, jadi LUBER 3px dan dipotong diam-diam oleh `overflow-hidden`:
 * tahun pada baris ketiga kehilangan kaki hurufnya, dan kotaknya berdiri tanpa
 * satu piksel pun padding.
 *
 * Wadah ikon dan kotak tanggal SENGAJA tidak lagi dipaksa seukuran (32 vs 36).
 * Yang harus sama antar panel adalah TINGGI BARISNYA, bukan ukuran penandanya
 * — dan itu sudah dijamin `min-h-15`. Menyamakan ukuran penanda justru yang
 * dulu memaksa tiga baris teks masuk ke kotak setinggi satu ikon.
 *
 * SKALA SUDUT — dua tingkat, dan hanya dua:
 *
 *   kartu luar     rounded-md    (8)   panel, kartu metrik
 *   isi kartu      rounded-sm    (6)   baris daftar, wadah ikon, kotak
 *                                      tanggal, kotak angka, chip
 *
 * Sudut isi selalu LEBIH KECIL daripada sudut wadahnya. Lengkung yang sama
 * besar di dua tingkat membuat yang di dalam terlihat menonjol keluar, dan
 * lengkung besar pada kotak setinggi 32px terbaca sebagai kapsul yang gagal.
 *
 * Sisi kiri badan panel sengaja sama dengan sisi kiri kepalanya (14px):
 * judul panel dan item pertamanya berdiri pada satu garis, bukan bergeser dua
 * piksel yang justru lebih terasa daripada perbedaan besar.
 *
 * SKALA HURUF — juga satu-satunya:
 *
 *   judul panel     14px   semibold
 *   subjudul panel  11.5px muted
 *   judul item      12px   medium
 *   keterangan item 10.5px muted
 *   angka item      16px   semibold
 *
 * Nilai lain tidak dipakai. Campuran 2/2.5/3/3.5 yang tumbuh sendiri-sendiri
 * membuat satu panel terlihat mepet dan tetangganya terlihat lega meski
 * keduanya "kelihatan rapi" sendiri-sendiri — dan campuran 11.5/12/12.5 pada
 * judul item membuat dua daftar bersebelahan terbaca sebagai dua sistem.
 *
 * Yang menegakkan aturan ini adalah komponennya, bukan disiplin penulisnya:
 * `Panel` memegang kepala dan badan, `ItemList` memegang jaraknya, `ListItem`
 * memegang anatomi satu baris. Bagian yang memanggil hanya menyebut isinya.
 */

/* ------------------------------------------------------- wadah ikon */

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

/* ------------------------------------------------------ kartu metrik */

/**
 * Kartu metrik.
 *
 * Dua kolom: angka dengan keterangannya di kiri, pembanding di kanan. Kolom
 * kanan boleh kosong — sebuah kartu yang memang tidak punya pembanding nyata
 * lebih baik berakhir lebih pendek daripada diisi angka karangan.
 *
 * `series` hanya diberikan bila deret bulanannya benar-benar ada. Tidak ada
 * garis mini yang dibangkitkan dari satu angka agregat.
 */
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
  /** Sudah diformat oleh pemanggil: ada yang angka, ada yang rupiah. */
  value: string;
  description?: string;
  icon: LucideIcon;
  tone: Aksen;
  /** Selisih nyata terhadap bulan lalu. NULL bila tak terhitung. */
  delta?: number | null;
  /** Deret bulanan nyata untuk garis mini. */
  series?: number[];
  /** Pembanding nyata untuk kartu tanpa riwayat bulanan. */
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
          {/* Ukuran turun bertahap untuk nilai panjang. Diukur di peramban
              pada 1280px: "Rp 1.500.000" pada 24px meminta 152px sementara
              kolomnya hanya 149px, dan nilai utama kartu ikut terpotong. */}
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
            /* Dua baris, bukan satu baris terpotong. Diukur di peramban pada
               1280px: "Masuk Rp 500.000 · keluar Rp 0" meminta 161px
               sementara kolomnya 149px, dan separuh keterangannya hilang.
               Kisinya memakai `auto-rows-fr`, jadi baris kedua di satu kartu
               tidak membuat kartu sebelahnya ikut jomplang. */
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
              /* Dibungkus chip seperti chip tren di sebelahnya: tanpa bidang
                 sendiri, angka pembanding melayang di sudut kartu dan terbaca
                 sebagai potongan yang tertinggal. */
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

/* ------------------------------------------------------------ panel */

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
  /** Dipakai ketika isinya perlu ikut tumbuh mengisi tinggi kartu. */
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

/* ------------------------------------------------------- daftar item */

/**
 * Bungkus daftar item.
 *
 * `content-start` disengaja: sebelumnya tiap daftar memusatkan dirinya sendiri
 * di dalam panel yang tingginya diregang baris, sehingga tiga item yang sama
 * persis muncul rapat di satu panel dan berjarak di panel sebelahnya. Sisa
 * tinggi kartu bukan milik daftar; ia sisa, dan tempatnya di bawah.
 */
export function ItemList({
  children,
  className,
}: {
  children: React.ReactNode;
  /** Hanya untuk jumlah kolom. Jarak dan perataannya tidak bisa diganti. */
  className?: string;
}) {
  return (
    <ul className={cn("grid content-start gap-2", className)}>{children}</ul>
  );
}

/**
 * Satu baris daftar.
 *
 * Anatomi tunggal untuk SELURUH daftar dashboard: penanda di kiri (wadah ikon
 * atau kotak tanggal), judul dengan keterangannya di tengah, dan satu hal di
 * kanan — angka, lencana, atau tanda panah.
 *
 * Sebelum komponen ini ada, tujuh daftar menuliskan susunan yang sama tujuh
 * kali, dan ketujuhnya perlahan berbeda: 11.5px di satu tempat dan 12.5px di
 * tempat lain, `mt-0.5` yang ada di sebagian saja, angka 16/17/18px pada tiga
 * panel yang berdiri bersebelahan.
 */
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
  /** Membuat barisnya dapat diklik, lengkap dengan keadaan tunjuknya. */
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

  // `min-h-15` (60px) menyamakan tinggi baris yang PUNYA keterangan dengan
  // yang tidak. Tanpa itu tinggi baris ditentukan oleh ada-tidaknya satu baris
  // teks, dan dua panel bersebelahan berbeda beberapa piksel tanpa satu pun
  // padding yang berbeda. Tinggi baris daftar tidak boleh ditentukan isinya.
  //
  // Angkanya sekaligus menyediakan ruang bagi penanda terbesar — kotak tanggal
  // 36px. Lihat hitungan border-box di kepala berkas: padding DAN border sama-
  // sama dipotong dari 60px, menyisakan 38px.
  const kelas = cn(
    "flex min-h-15 items-center gap-3 rounded-sm border border-border px-3 py-2.5",
    href &&
      "transition-colors hover:border-primary-border hover:bg-primary-soft",
  );

  return (
    // `list-none` DI SINI, bukan hanya di `ItemList`.
    //
    // Preflight Tailwind mematikan penanda lewat `ol, ul, menu { list-style:
    // none }` — pada WADAHNYA. `list-style-type` memang sifat warisan, jadi
    // selama `<li>` ini berada di dalam `<ul>` miliknya, penandanya padam.
    // Begitu seseorang menaruhnya di dalam `<div>`, tidak ada lagi yang
    // mewariskan apa pun: `li` kembali ke nilai awal `disc` dan sebuah titik
    // muncul di kiri baris.
    //
    // Itu bukan kemungkinan teoretis — persis itulah yang terjadi pada panel
    // Pemilihan, dan titiknya bertahan sampai ada yang melaporkannya. Baris
    // daftar yang penampilannya bergantung pada tag pembungkusnya adalah
    // baris yang menunggu giliran untuk rusak lagi.
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

/** Angka di ujung kanan sebuah baris. Satu ukuran, di semua panel. */
export function ItemValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[16px] leading-none font-semibold text-foreground">
      {children}
    </span>
  );
}

/**
 * Lencana seukuran baris daftar.
 *
 * `Badge` dipakai seluruh aplikasi dan ukurannya pas untuk tabel dan halaman
 * rincian. Di dalam baris setinggi 48px ia terlalu tinggi, jadi yang diubah
 * ukurannya di sini — bukan lencana untuk semua halaman.
 */
export const LENCANA_RINGKAS = "px-1.5 text-[10px]";

/* ------------------------------------------------------- slot konten */

/**
 * Batas preview seluruh dashboard.
 *
 * Satu angka, dipakai semua daftar: jadwal, administrasi, aktivitas,
 * pengumuman. Dashboard bukan tempat memuat seluruh tabel — yang lengkap ada
 * di modulnya, dan setiap panel yang datanya bisa lebih panjang membawa
 * "Lihat semua" ke sana.
 */
export const BATAS_PRATINJAU = 3;

/**
 * Slot isi panel daftar.
 *
 * TIDAK LAGI memasang lantai 160px. Lantai itu dulu dipakai supaya panel
 * berisi satu item tidak runtuh di sebelah panel berisi tiga — tetapi
 * kesejajaran baris sudah dikerjakan oleh kisi barisnya sendiri, yang memang
 * meregangkan setiap kartu ke tinggi kartu tertinggi. Lantai itu MENAMBAH
 * pekerjaan yang sudah selesai, dan menambahkannya di tempat yang salah.
 *
 * Akibatnya terukur di peramban pada 1440px: pada baris yang KEDUA panelnya
 * sama-sama berisi dua item — Jadwal Terdekat dan Pengumuman Terbaru pada
 * dashboard anggota — isinya hanya menuntut 104px, tetapi lantainya memaksa
 * 160px. Keduanya lalu berdiri setinggi 221px dengan 56px ruang kosong di
 * bawah masing-masing. Tidak ada yang meminta ruang itu; ia semata sisa dari
 * angka yang dipatok di muka.
 *
 * Tanpa lantai, baris itu menyusut ke tinggi yang benar-benar dibutuhkan dan
 * lubang di bawah kedua panel hilang sama sekali. Baris yang panelnya memang
 * berbeda isi tetap sejajar — regangan kisi yang mengurusnya — dan sisa ruang
 * hanya muncul pada panel yang datanya memang lebih sedikit, sebesar selisih
 * yang sebenarnya, bukan sebesar angka yang dipatok.
 *
 * `grid` tetap dipertahankan: anak tunggal sebuah kisi meregang mengisi
 * kotaknya, dan itulah yang membuat keadaan kosong ikut memenuhi tinggi kartu
 * ketika tetangganya lebih tinggi.
 */
export const SLOT_KONTEN = "grid";

/**
 * Keadaan kosong yang ringkas.
 *
 * Dipusatkan di dalam slot yang sama dengan daftarnya, sehingga kartu yang
 * belum punya isi tetap sejajar dengan tetangganya — tanpa baris palsu, dan
 * tanpa kartu yang menciut sampai tinggal judulnya.
 *
 * `min-h-[128px]` menggantikan lantai yang dulu dipegang `SLOT_KONTEN`, dan
 * hanya di sini. Inilah satu-satunya keadaan yang memang perlu lantai:
 * panel tanpa isi tidak punya apa pun untuk menentukan tingginya, dan tanpa
 * angka ini ia menciut sampai tinggal judul lalu terbaca sebagai kartu yang
 * rusak.
 *
 * Angkanya TURUNAN, bukan pilihan: dua baris item beserta jarak di antaranya,
 * 2×60 + 8 = 128. Ia ikut ketika tinggi baris berubah — dulu 104 ketika
 * barisnya 48px. Lantai yang dipatok lepas dari tinggi baris akan meleset
 * diam-diam pada penyetelan berikutnya.
 */
export function EmptyNote({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[128px] flex-col items-center justify-center gap-2 py-4 text-center">
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

/* ---------------------------------------------------- kisi statistik */

/**
 * Kotak angka, dua kolom.
 *
 * Pola yang SENGAJA berbeda dari `SummaryList`: dua kolom kotak pendek, bukan
 * satu kolom baris panjang. Dashboard yang seluruh panelnya berupa daftar
 * baris terbaca datar meski isinya banyak.
 *
 * Keterangan panjang sengaja tidak ikut. Kotak ini untuk angka yang cukup
 * dibaca sekilas; yang butuh penjelasan tetap di daftar baris.
 */
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

/* --------------------------------------------------------- progres */

/**
 * Satu batang progres.
 *
 * Dipakai HANYA untuk rasio yang memang tersimpan sebagai dua angka —
 * pembilang dan penyebutnya keduanya nyata. Persentase yang dikarang dari satu
 * angka bukan progres, ia hiasan.
 */
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
    // Kotak, jarak, dan huruf yang sama persis dengan `ListItem`: batang ini
    // berdiri tepat di bawah baris daftar, dan dua kotak bersebelahan dengan
    // padding berbeda terbaca sebagai dua komponen yang tidak sengaja bertemu.
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

/* -------------------------------------------------- baris ringkasan */

export type SummaryRow = {
  label: string;
  value: string;
  context?: string;
  icon: LucideIcon;
  tone: Aksen;
};

/**
 * Kartu kecil, mendatar.
 *
 * BUKAN kartu metrik versi mini: angkanya berdampingan dengan ikonnya, bukan
 * di bawahnya, sehingga tingginya tinggal satu baris ikon dan bukan tiga baris
 * teks bertumpuk.
 *
 * `fill` merenggangkan barisnya mengisi tinggi kartu. Dipakai ketika panelnya
 * bersebelahan dengan kartu grafik yang lebih tinggi — tanpa itu barisnya
 * menumpuk di atas sambil meninggalkan sepertiga kartu kosong di bawah.
 */
export function SummaryList({ rows }: { rows: SummaryRow[] }) {
  return (
    // Dua kolom, bukan empat, pada lebar menengah: diukur di peramban pada
    // 1024px, empat kolom menyisakan 79px untuk teks dan memotong keterangan
    // sependek "12 bulan terakhir".
    //
    // Barisnya TIDAK lagi diregang mengisi tinggi kartu. Meregangkannya
    // membuat item setinggi 81px — satu setengah kali item panel di
    // sebelahnya — hanya untuk menutupi sisa ruang; sisa ruang lebih baik
    // terlihat apa adanya daripada disamarkan dengan baris yang menggelembung.
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

/* ------------------------------------------------------- deret orang */

export type PersonPreview = {
  id: string;
  name: string;
  /** 'L' | 'P' | null, apa adanya dari basis data. Hanya untuk avatar. */
  gender?: StoredGender;
  /** Tanda kecil di sudut avatar. Dipakai untuk akun nonaktif. */
  flagged?: boolean;
};

/**
 * Kisi wajah yang ringkas.
 *
 * Memakai komponen `Avatar` yang sama dengan seluruh aplikasi — bukan resolver
 * khusus dashboard. Kalau aturan "unggahan menang, lalu jenis kelamin
 * tersimpan, lalu netral" ditulis ulang di sini, cepat atau lambat salah
 * satunya akan berbeda.
 *
 * Kisi, bukan gulungan mendatar: kartunya selebar setengah halaman, dan
 * deretan satu baris menyisakan ruang kosong besar di bawahnya sementara
 * sebagian wajah tetap tersembunyi di luar layar.
 */
export function PersonGrid({
  people,
  align = "stretch",
}: {
  people: PersonPreview[];
  /**
   * `center` memakai kolom berukuran tetap dan memusatkannya. Dipakai ketika
   * jumlah orangnya sedikit dan kartunya lebar: kolom yang meregang membuat
   * lima wajah berjarak seperti pagar, sementara yang dipusatkan terbaca
   * sebagai satu deret.
   */
  align?: "stretch" | "center";
}) {
  return (
    // `auto-fill` alih-alih jumlah kolom tetap: panel yang sama muncul selebar
    // setengah halaman pada satu peran dan selebar penuh pada peran lain, dan
    // enam kolom yang pas di tempat pertama menjadi renggang di tempat kedua.
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
