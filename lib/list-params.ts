import "server-only";

/**
 * Pembacaan parameter daftar dari URL.
 *
 * Sembilan halaman manajemen membaca hal yang sama: kata pencarian, beberapa
 * saringan, dan nomor halaman. Menuliskannya sembilan kali berarti sembilan
 * kesempatan untuk berbeda — satu lupa memangkas spasi, satu menerima `page=0`
 * lalu menghitung offset negatif, satu meloloskan `%` ke dalam pola LIKE.
 *
 * `searchParams` di Next.js dapat berisi ARRAY ketika satu kunci muncul dua
 * kali di URL (`?status=A&status=B`). Nilai seperti itu ditolak menjadi string
 * kosong, bukan dipaksa `String(value)` yang akan menghasilkan "A,B" lalu
 * dikirim ke database sebagai satu nilai yang mustahil cocok.
 */

export type ParamDaftar<K extends string = never> = {
  /** Sudah dipangkas. String kosong berarti tidak mencari. */
  cari: string;
  /** Halaman ke berapa, minimal 1. */
  halaman: number;
  /** Indeks baris pertama untuk `.range()`. */
  dari: number;
  /** Indeks baris terakhir untuk `.range()`. */
  sampai: number;
  /**
   * Nilai saringan menurut kuncinya, sudah dibersihkan.
   *
   * Kuncinya GENERIK, bukan `Record<string, string>`. Bedanya nyata di bawah
   * `noUncheckedIndexedAccess`: indeks pada signature string mengembalikan
   * `string | undefined`, sehingga setiap pemakaian harus ditutup `?? ""` —
   * dan yang lupa akan mengirim `undefined` ke `.eq()`. Dengan kunci literal,
   * tipenya benar-benar `string` karena kuncinya memang pasti ada.
   */
  saring: Record<K, string>;
};

function satuNilai(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export function bacaParamDaftar<const K extends string = never>(
  params: Record<string, string | string[] | undefined>,
  {
    ukuranHalaman,
    kunciSaring = [] as unknown as readonly K[],
  }: { ukuranHalaman: number; kunciSaring?: readonly K[] },
): ParamDaftar<K> {
  const halaman = Math.max(1, Math.floor(Number(satuNilai(params.page)) || 1));
  const dari = (halaman - 1) * ukuranHalaman;

  return {
    cari: satuNilai(params.search).trim(),
    halaman,
    dari,
    sampai: dari + ukuranHalaman - 1,
    saring: Object.fromEntries(
      kunciSaring.map((kunci) => [kunci, satuNilai(params[kunci])]),
    ) as Record<K, string>,
  };
}

/**
 * Melindungi pola LIKE dari karakter yang punya arti khusus.
 *
 * Tanpa ini, mengetik `%` di kotak pencarian mencocokkan seluruh baris, dan
 * `_` mencocokkan karakter apa pun — pengguna melihat hasil yang tidak ia
 * minta dan mengira pencariannya rusak.
 */
export function polaCari(cari: string): string {
  return `%${cari.replace(/[%_\\]/g, "\\$&")}%`;
}

/**
 * Varian untuk `.or()`, yang memakai koma sebagai pemisah dan tanda kurung
 * sebagai pengelompokan — keduanya harus dibuang, bukan di-escape, karena
 * PostgREST mengurainya sebelum SQL melihatnya.
 */
export function polaCariOr(cari: string): string {
  return cari.replace(/[%_\\(),]/g, "");
}
