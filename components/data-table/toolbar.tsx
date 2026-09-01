"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
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
 * Lebar penyaring — tiga tingkat, dipilih menurut LABEL TERPANJANGNYA.
 *
 * Sebelumnya setiap penyaring dipatok `sm:w-44` (176px), berapa pun panjang
 * teksnya. Akibatnya "Semua status" duduk di dalam kotak yang separuhnya
 * kosong, sementara "Operator Organisasi" nyaris menyentuh tepi — satu angka
 * salah untuk keduanya sekaligus.
 *
 *   xs  136  Status, Tipe, Tahun — label pendek dan tetap
 *   sm  168  Kategori, Periode, Jenjang
 *   md  208  Role, nama organisasi, label yang memang panjang
 *
 * Bukan `w-auto`. Lebar otomatis pada `<select>` mengikuti OPSI TERPANJANG,
 * sehingga satu opsi "Dokumentasi Kegiatan" melebarkan kotaknya jauh melewati
 * "Semua kategori" yang biasanya terlihat — dan lebarnya berubah-ubah begitu
 * pilihan diganti. Lebar yang dipilih di muka membuat toolbar diam.
 *
 * Ini HANYA untuk penyaring toolbar. Field di dalam form tetap mengikuti kisi
 * formnya; menyempitkannya menjadi selebar isi akan membuat form terbaca
 * seperti deretan chip.
 */
const LEBAR_FILTER = {
  xs: "sm:w-34",
  sm: "sm:w-42",
  md: "sm:w-52",
} as const;

export type FilterSize = keyof typeof LEBAR_FILTER;

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
  size?: FilterSize;
};

/**
 * Penyaring rentang tanggal.
 *
 * Terpisah dari `TableFilter` karena bentuknya memang lain: ia dua kotak
 * tanggal, bukan satu daftar pilihan, dan tidak punya opsi "semua" — kosong
 * berarti tak dibatasi.
 *
 * Ada di sini, bukan sebagai form tersendiri di halaman yang membutuhkannya,
 * supaya ia ikut aturan yang sama: menulis ke URL, mengosongkan `page`, dan
 * ikut terhapus oleh tombol Reset. Halaman Transaksi sempat menuliskannya
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
  const [isPending, startTransition] = useTransition();

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
      // Tanpa perbandingan ini, menekan Reset menghasilkan dua navigasi yang
      // saling menimpa: Reset menghapus seluruh parameter, lalu 350ms kemudian
      // debounce yang ikut tersulut oleh `setSearch("")` menyala membawa
      // parameter versi lama dan MENGEMBALIKAN penyaring yang baru saja
      // dihapus. Terlihat di peramban sebagai `?jenis=organization` yang
      // muncul lagi sesudah Reset.
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

  const adaFilter =
    (adaPencarian && search !== "") ||
    filters.some((filter) => filter.value !== "") ||
    dateFilters.some((filter) => filter.value !== "");

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

      {filters.length > 0 || dateFilters.length > 0 || adaFilter ? (
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
              className={cn("w-full", LEBAR_FILTER[filter.size ?? "sm"])}
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

          {adaFilter ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => {
                setSearch("");
                updateParams({
                  ...(adaPencarian ? { [searchKey]: null } : {}),
                  page: null,
                  ...kosongkanLain(),
                  ...Object.fromEntries(
                    [...filters, ...dateFilters].map((filter) => [
                      filter.key,
                      null,
                    ]),
                  ),
                });
              }}
            >
              <X size={15} aria-hidden="true" />
              Reset
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
