/**
 * Aksen dashboard.
 *
 * Satu daftar untuk seluruh dashboard — platform maupun organisasi — supaya
 * kategori yang sama tidak berwarna biru di satu halaman dan ungu di halaman
 * lain. Biru selalu lebih dulu: ia warna merek, dan aksen lain hanya bertugas
 * MEMBEDAKAN hal yang berdampingan.
 *
 * Aksen BUKAN status. Merah mawar di sini berarti "kategori keenam", bukan
 * "gagal" — token semantik destructive/warning tetap satu-satunya sumber untuk
 * itu, dan tidak dipakai sebagai warna kategori.
 */
export type Aksen = "blue" | "cyan" | "purple" | "amber" | "rose" | "slate";

/** Warna garis dan irisan, untuk SVG dan gaya sebaris. */
export const AKSEN: Record<Aksen, string> = {
  blue: "hsl(var(--primary))",
  cyan: "hsl(var(--accent-cyan))",
  purple: "hsl(var(--accent-purple))",
  amber: "hsl(var(--accent-amber))",
  rose: "hsl(var(--accent-rose))",
  slate: "hsl(var(--accent-slate))",
};

/** Wadah ikon: latar lembut dengan ikon sewarna, untuk kelas Tailwind. */
export const WADAH: Record<Aksen, string> = {
  blue: "bg-primary-soft text-primary",
  cyan: "bg-accent-cyan-soft text-accent-cyan",
  purple: "bg-accent-purple-soft text-accent-purple",
  amber: "bg-accent-amber-soft text-accent-amber",
  rose: "bg-accent-rose-soft text-accent-rose",
  slate: "bg-accent-slate-soft text-accent-slate",
};

/** Urutan tetap untuk donat: irisan terbesar selalu biru merek. */
export const URUTAN_AKSEN: Aksen[] = [
  "blue",
  "cyan",
  "purple",
  "amber",
  "rose",
  "slate",
];
