import { cn } from "@/lib/utils";

/**
 * Tabel data.
 *
 * `TableScroll` membungkus tabel dengan container yang menggulir sendiri.
 * Ini yang menjaga janji "tidak ada horizontal overflow di level halaman":
 * tabel lebar menggulir di dalam kotaknya, bukan mendorong seluruh halaman
 * (docs/UI.md §67, §103).
 *
 * `bounded` menambahkan batas tinggi. Tanpa itu, seratus baris membuat kartu
 * setinggi enam ribu piksel dan pagination di kaki tabel terdorong jauh di
 * bawah layar — pengguna harus menggulir seluruh halaman hanya untuk mencapai
 * tombol "Berikutnya".
 *
 * Batasnya MENGIKUTI TINGGI LAYAR, bukan angka mati: `calc(100dvh-20rem)`
 * menyisakan ruang untuk kepala halaman, toolbar, dan kaki tabel. Karena yang
 * dipakai `max-height` dan `overflow-y: auto`, tabel berisi tiga baris tetap
 * setinggi tiga baris — batas ini hanya bekerja ketika memang dilampaui.
 *
 * TIDAK ADA `min-height`. Sebelumnya ada, 220px, dan itu membatalkan kalimat
 * di atas: diukur di peramban pada halaman Kepengurusan, tabel berisi dua
 * baris setinggi 134px duduk di dalam kotak 220px — 86px kosong yang tidak
 * pernah diminta siapa pun, pada setiap tabel yang datanya sedikit. Batas
 * bawah adalah cara membuat kekosongan, bukan cara mencegahnya.
 *
 * Gulirannya memakai `.scroll-area`, utilitas yang SAMA dengan sidebar dan
 * dialog: batang gulir 4px, jalur transparan, thumb yang menggelap saat
 * ditunjuk. Tidak ada CSS scrollbar kedua di project ini.
 */
export function TableScroll({
  className,
  bounded = false,
  ...props
}: React.ComponentProps<"div"> & {
  /** Membatasi tinggi dan menyalakan guliran vertikal di dalam tabel. */
  bounded?: boolean;
}) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto",
        bounded && "scroll-area max-h-[calc(100dvh-20rem)]",
        className,
      )}
      {...props}
    />
  );
}

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <table
      className={cn("w-full border-collapse text-sm", className)}
      {...props}
    />
  );
}

/**
 * Kepala tabel, MENEMPEL di atas ketika badannya menggulir.
 *
 * Latarnya solid, bukan `bg-muted/60` seperti dulu: latar tembus pandang
 * membuat baris yang lewat di bawahnya terbaca menembus nama kolom. Pada
 * tabel yang tidak menggulir, `sticky` tidak melakukan apa pun — jadi ini
 * aman dipasang di semua tabel sekaligus.
 */
export function TableHead({
  className,
  ...props
}: React.ComponentProps<"thead">) {
  return (
    <thead className={cn("sticky top-0 z-10 bg-muted", className)} {...props} />
  );
}

export function TableBody({
  className,
  ...props
}: React.ComponentProps<"tbody">) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors last:border-b-0 hover:bg-muted/40",
        className,
      )}
      {...props}
    />
  );
}

export function TableHeaderCell({
  className,
  ...props
}: React.ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "h-10 whitespace-nowrap border-b border-border px-4 text-left",
        "text-[13px] font-medium text-muted-foreground",
        "first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle text-foreground",
        "first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5",
        className,
      )}
      {...props}
    />
  );
}
