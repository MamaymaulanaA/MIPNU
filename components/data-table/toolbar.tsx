"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";

import { Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * Toolbar daftar: pencarian di kiri, penyaring di kanan.
 *
 * SATU komponen untuk seluruh halaman daftar. Sebelumnya hanya Data Anggota
 * yang punya toolbar, dan ia menuliskannya sendiri — lengkap dengan debounce,
 * sinkronisasi URL, dan tombol reset. Halaman daftar berikutnya akan menyalin
 * ketiganya, lalu perlahan berbeda: satu me-debounce 350ms, satu tidak, satu
 * lupa menghapus `page` ketika penyaringnya berubah sehingga pengguna
 * terlempar ke halaman kosong.
 *
 * LEBAR PENCARIAN. Yang lama memakai `flex-1` TETAPI dibatasi `sm:max-w-xs`
 * (320px), sehingga kolomnya berhenti tumbuh dan menyisakan ruang kosong lebar
 * di kanan. Di sini pencarian benar-benar tumbuh, dan penyaringnya yang
 * didorong ke ujung kanan.
 *
 * SELURUH KEADAAN DISIMPAN DI URL, bukan di state klien: hasil penyaringan
 * dapat dibagikan sebagai tautan dan bertahan saat halaman dimuat ulang
 * (ARCHITECTURE.md §79). Pencarian dan penyaringan dieksekusi di database;
 * komponen ini hanya menyusun query string.
 */

/**
 * Lebar penyaring: ditentukan ISINYA, bukan dipilih di muka.
 *
 * Sebelumnya ada tiga tingkat tetap — 136, 168, dan 208px — dan penulis
 * halaman memilih salah satunya. Diukur di peramban pada 22 halaman Pengurus,
 * tebakan itu meleset ke DUA arah sekaligus:
 *
 *   Pemilihan "Semua status"     168 dipakai, 136 dibutuhkan  (32px sia-sia)
 *   Agenda    "Semua jenis"      168 dipakai, 138 dibutuhkan  (30px sia-sia)
 *   Transaksi "Semua akun"       168 dipakai, 139 dibutuhkan  (29px sia-sia)
 *   Event     "Semua status"     168 dipakai, 179 dibutuhkan  (TERPOTONG)
 *   Dokumen   "Semua kategori"   168 dipakai, 193 dibutuhkan  (TERPOTONG)
 *
 * Dua yang terakhir bukan soal rapi: "Pendaftaran ditutup" dan "Dokumentasi
 * Kegiatan" benar-benar terpotong ketika terpilih.
 *
 * `w-auto` memperbaiki keduanya sekaligus. Komentar lama menolaknya dengan
 * alasan "lebarnya berubah-ubah begitu pilihan diganti" — dan itu KELIRU;
 * diuji langsung, satu select `w-auto` diukur pada keenam pilihannya
 * memberikan 136px setiap kali. Lebar select native mengikuti opsi
 * TERPANJANG, dan opsi terpanjang tidak berubah ketika pengguna memilih.
 * Toolbar tetap diam.
 *
 * `w-auto` saja masih menyisakan satu masalah: ia selebar opsi TERPANJANG,
 * jadi penyaring Event duduk di 179px demi "Pendaftaran ditutup" walau yang
 * tampil "Semua status" (134px) — 45px kosong sepanjang waktu.
 * `field-sizing: content` menyelesaikannya: kotaknya selebar nilai yang
 * SEDANG tampil, dan melebar sendiri ketika opsi panjang itu benar dipilih,
 * sehingga tidak ada yang terpotong maupun menganggur.
 *
 * Harganya: pada halaman dengan beberapa penyaring sebaris, satu yang
 * menyusut menggeser tetangga kanannya — terukur 17px di Transaksi, satu-
 * satunya halaman dengan enam penyaring. Itu dapat diterima karena mengubah
 * penyaring memang memicu navigasi dan tabelnya dimuat ulang; pergeseran itu
 * terjadi bersama perubahan yang jauh lebih besar, bukan pada halaman diam.
 * Sembilan halaman lain hanya punya satu atau dua penyaring.
 *
 * `max-w` tetap menjaga satu nama yang sangat panjang agar tidak menelan
 * toolbar.
 *
 *   max-w-56  224px  langit-langit — satu nama panjang tidak menelan toolbar
 *
 * TANPA lantai. Sebelumnya ada `min-w-28` (112px) dengan alasan sasaran klik,
 * dan alasan itu keliru: yang menentukan kenyamanan menekan adalah TINGGI —
 * 44px di desktop, 46px di ponsel — bukan lebar. Lantai itu justru menjadi
 * satu-satunya hal yang tersisa yang menahan kotak agar tidak mengecil.
 * Terukur pada halaman Periode: "Aktif" hanya butuh 77px tetapi mendapat
 * 112px, "Draf" butuh 74px juga mendapat 112px. Status sebaris tidak pernah
 * punya lantai dan turun sampai 67px tanpa masalah.
 *
 * Hanya untuk penyaring toolbar. Field di dalam form tetap mengikuti kisi
 * formnya; menyempitkannya menjadi selebar isi membuat form terbaca seperti
 * deretan chip.
 */
const LEBAR_FILTER = "sm:field-sizing-content sm:w-auto sm:max-w-56";

export type TableFilter = {
  /** Nama parameter di URL. */
  key: string;
  /** Untuk pembaca layar — labelnya tidak tampil. */
  label: string;
  value: string;
  /** Pilihan "semua" ditambahkan sendiri sebagai nilai kosong. */
  allLabel: string;
  options: { value: string; label: string }[];
  /** Bawaannya `sm`. Pilih menurut label terpanjang yang mungkin tampil. */
};

/**
 * Penyaring rentang tanggal.
 *
 * Terpisah dari `TableFilter` karena bentuknya memang lain: ia dua kotak
 * tanggal, bukan satu daftar pilihan, dan tidak punya opsi "semua" — kosong
 * berarti tak dibatasi.
 *
 * Ada di sini, bukan sebagai form tersendiri di halaman yang membutuhkannya,
 * supaya ia ikut aturan yang sama: menulis ke URL dan mengosongkan `page`.
 * Halaman Transaksi sempat menuliskannya
 * sendiri lengkap dengan tombol "Terapkan" — satu-satunya penyaring di seluruh
 * aplikasi yang menuntut klik kedua sebelum bekerja.
 */
export type TableDateFilter = {
  key: string;
  /** Untuk pembaca layar — labelnya tidak tampil. */
  label: string;
  value: string;
};

export function TableToolbar({
  searchKey = "search",
  searchValue,
  searchPlaceholder,
  searchLabel,
  filters = [],
  dateFilters = [],
  resetKeys = [],
}: {
  searchKey?: string;
  /**
   * Nilai pencarian dari URL, atau `undefined` bila halaman ini memang TIDAK
   * punya pencarian.
   *
   * Laporan Keuangan adalah contohnya: `mipnu_finance_summary()` menerima
   * rentang tanggal dan akun, dan tidak menerima kata pencarian apa pun.
   * Memasang kotak pencarian di sana hanya demi bentuk toolbar yang seragam
   * akan menjanjikan sesuatu yang tidak pernah bekerja — dan penyaring yang
   * tidak didukung backend adalah penyaring palsu.
   */
  searchValue?: string;
  searchPlaceholder?: string;
  searchLabel?: string;
  filters?: TableFilter[];
  dateFilters?: TableDateFilter[];
  /**
   * Parameter LAIN yang ikut dikosongkan setiap pencarian atau penyaring
   * berubah — di luar `page` yang selalu dikosongkan.
   *
   * Dipakai halaman yang punya lebih dari satu daftar, dan karena itu lebih
   * dari satu nomor halaman. Tanpa ini, menyaring daftar pertama meninggalkan
   * nomor halaman daftar kedua pada nilai lamanya, dan daftar itu tampil
   * kosong padahal hasilnya ada di halaman pertamanya.
   */
  resetKeys?: string[];
}) {
  const router = useRouter();
  // Hanya `startTransition` yang dipakai: penanda tertunda dulu dibutuhkan
  // untuk menonaktifkan tombol Reset, dan tombol itu sudah tidak ada.
  const [, startTransition] = useTransition();

  const adaPencarian = searchValue !== undefined;
  const [search, setSearch] = useState(searchValue ?? "");
  const isFirstRender = useRef(true);

  // Debounce: menunggu pengguna berhenti mengetik supaya satu kata pencarian
  // tidak menghasilkan satu request per huruf.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!adaPencarian) return;

    const timer = setTimeout(() => {
      // Dibandingkan dengan URL SAAT INI, bukan dengan nilai dari closure.
      //
      // Debounce yang tertunda memegang nilai dari render yang sudah lewat.
      // Bila URL berpindah lebih dulu — tombol kembali peramban, atau
      // penyaring yang diubah dalam 350ms itu — debounce menyala membawa
      // keadaan lama dan mengembalikan parameter yang baru saja hilang.
      // Perbandingan ini membuatnya diam ketika tidak ada yang berubah.
      const sekarang =
        new URLSearchParams(window.location.search).get(searchKey) ?? "";
      if (sekarang === search) return;

      updateParams({ [searchKey]: search, page: null, ...kosongkanLain() });
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /** `resetKeys` sebagai objek berisi null, siap disebar ke `updateParams`. */
  function kosongkanLain(): Record<string, null> {
    return Object.fromEntries(resetKeys.map((kunci) => [kunci, null]));
  }

  function updateParams(updates: Record<string, string | null>) {
    // Selalu dari URL saat ini. `useSearchParams()` mencerminkan render yang
    // sedang berjalan, dan pemanggil tertunda seperti debounce dapat menyala
    // ketika render itu sudah usang.
    const params = new URLSearchParams(window.location.search);

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `?${query}` : "?");
    });
  }

  return (
    <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:flex-wrap sm:items-center sm:p-5">
      {/*
        Pencarian mengambil sisa ruang. TIDAK ada `max-w` di sini — itulah yang
        dulu membuatnya berhenti di 320px.

        Tetapi ia juga punya batas BAWAH, dan barisnya boleh membungkus. Diukur
        di peramban pada 1440px, halaman Transaksi dengan enam penyaring
        (empat daftar pilihan dan dua kotak tanggal) menyisakan 122px untuk
        kotak pencarian — sempit hanya karena tetangganya banyak. Dengan batas
        bawah 220px, kelompok penyaring yang tidak lagi muat turun ke barisnya
        sendiri, dan pencarian mendapat lebar penuh. Halaman dengan satu atau
        dua penyaring tidak berubah sama sekali: keduanya tetap muat sebaris.
      */}
      {adaPencarian ? (
        <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            className="pl-9"
          />
        </div>
      ) : null}

      {filters.length > 0 || dateFilters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <Select
              key={filter.key}
              value={filter.value}
              aria-label={filter.label}
              onChange={(event) =>
                updateParams({
                  [filter.key]: event.target.value,
                  page: null,
                  ...kosongkanLain(),
                })
              }
              className={cn("w-full", LEBAR_FILTER)}
            >
              <option value="">{filter.allLabel}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          ))}

          {dateFilters.map((filter) => (
            <Input
              key={filter.key}
              type="date"
              value={filter.value}
              aria-label={filter.label}
              onChange={(event) =>
                updateParams({
                  [filter.key]: event.target.value,
                  page: null,
                  ...kosongkanLain(),
                })
              }
              className="w-full sm:w-40"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
