import "server-only";

import { cache } from "react";

import { getAccessContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

/**
 * Jenis kelamin pada data anggota milik pengguna sendiri.
 *
 * HANYA untuk memilih avatar bawaan. Tidak dipakai untuk keputusan apa pun
 * yang lain, dan tidak pernah ditebak — bila kolomnya kosong, hasilnya NULL
 * dan avatar netral yang dipakai (docs/UI.md §34).
 *
 * Tidak ada pelonggaran wewenang di sini: barisnya dibaca dengan client
 * ber-scope pengguna, dan policy `members_select` memang mengizinkan setiap
 * orang membaca baris anggotanya SENDIRI. Pengguna yang belum tertaut ke
 * data anggota mendapat NULL.
 */
export const getOwnGender = cache(async (): Promise<"L" | "P" | null> => {
  const context = await getAccessContext();
  if (!context?.memberId) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("members")
    .select("gender")
    .eq("id", context.memberId)
    .maybeSingle();

  if (error || !data) return null;

  return data.gender === "L" || data.gender === "P" ? data.gender : null;
});
