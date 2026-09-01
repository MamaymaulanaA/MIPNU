"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

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

export type TableFilter = {
  /** Nama parameter di URL. */
  key: string;
  /** Untuk pembaca layar — labelnya tidak tampil. */
  label: string;
  value: string;
  /** Pilihan "semua" ditambahkan sendiri sebagai nilai kosong. */
  allLabel: string;
  options: { value: string; label: string }[];
};

export function TableToolbar({
  searchKey = "search",
  searchValue,
  searchPlaceholder,
  searchLabel,
  filters = [],
}: {
  searchKey?: string;
  searchValue: string;
  searchPlaceholder: string;
  searchLabel: string;
  filters?: TableFilter[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchValue);
  const isFirstRender = useRef(true);

  // Debounce: menunggu pengguna berhenti mengetik supaya satu kata pencarian
  // tidak menghasilkan satu request per huruf.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

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

      updateParams({ [searchKey]: search, page: null });
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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
    search !== "" || filters.some((filter) => filter.value !== "");

  return (
    <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:p-5">
      {/* Pencarian mengambil sisa ruang. TIDAK ada `max-w` di sini — itulah
          yang dulu membuatnya berhenti di 320px. */}
      <div className="relative min-w-0 flex-1">
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

      {filters.length > 0 || adaFilter ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <Select
              key={filter.key}
              value={filter.value}
              aria-label={filter.label}
              onChange={(event) =>
                updateParams({ [filter.key]: event.target.value, page: null })
              }
              className="w-full sm:w-44"
            >
              <option value="">{filter.allLabel}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          ))}

          {adaFilter ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => {
                setSearch("");
                updateParams({
                  [searchKey]: null,
                  page: null,
                  ...Object.fromEntries(
                    filters.map((filter) => [filter.key, null]),
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
