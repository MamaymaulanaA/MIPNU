import "server-only";

import { cache } from "react";

import {
  listAccessibleOrganizations,
  resolveOrganizationId,
} from "@/lib/auth/context";

/**
 * Jenis kelamin pada data anggota milik pengguna sendiri.
 *
 * HANYA untuk memilih avatar bawaan. Tidak dipakai untuk keputusan apa pun
 * yang lain, dan tidak pernah ditebak — bila kolomnya kosong, hasilnya NULL
 * dan avatar netral yang dipakai (docs/UI.md §34).
 *
 * TIDAK ADA permintaan tersendiri ke Supabase di sini.
 *
 * Sebelumnya berkas ini menjalankan query `members` sendiri, dan query itu
 * harus menunggu seluruh rantai konteks selesai lebih dulu — menambah satu
 * perjalanan penuh (diukur 114ms) ke setiap pemuatan halaman, hanya untuk
 * memilih gambar. Sekarang nilainya ikut terbawa pada query keanggotaan yang
 * memang sudah berjalan, dan keduanya dibaca dari cache request yang sama.
 */
export const getOwnGender = cache(async (): Promise<"L" | "P" | null> => {
  const [organizations, activeId] = await Promise.all([
    listAccessibleOrganizations(),
    resolveOrganizationId(),
  ]);

  if (!activeId) return null;

  const active = organizations.find(
    (organization) => organization.organizationId === activeId,
  );

  return active?.gender ?? null;
});
