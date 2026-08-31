import "server-only";

import { cache } from "react";

import { getCurrentProfile } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

/** Berlaku cukup lama untuk satu kunjungan, tidak lebih. */
const SIGNED_URL_SECONDS = 60 * 60;

/**
 * URL avatar milik pengguna saat ini.
 *
 * Bucket avatar bersifat privat, jadi tidak ada URL publik yang dapat
 * ditempel begitu saja — setiap tampilan menuntut signed URL baru
 * (docs/ARCHITECTURE.md §51).
 *
 * Mengembalikan NULL bila belum ada avatar, dan juga bila berkasnya sudah
 * tidak ada: profil tanpa gambar adalah keadaan yang sah, bukan error.
 */
export const getOwnAvatarUrl = cache(async (): Promise<string | null> => {
  const profile = await getCurrentProfile();
  if (!profile?.avatar_path) return null;

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from("avatars")
    .createSignedUrl(profile.avatar_path, SIGNED_URL_SECONDS);

  if (error) return null;

  return data.signedUrl;
});
