/**
 * Konstanta pengumuman.
 *
 * Tinggal di sini, BUKAN di file action, karena setiap export dari berkas
 * `"use server"` diperlakukan sebagai endpoint dan harus berupa fungsi async.
 * Sebuah array yang diekspor dari sana sampai ke client sebagai referensi
 * action — dan baru terlihat rusak saat komponen memanggil `.map()` di atasnya,
 * jauh dari tempat kesalahannya.
 */

export const ANNOUNCEMENT_AUDIENCES = ["ALL_MEMBERS", "PENGURUS"] as const;
export const ANNOUNCEMENT_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];
