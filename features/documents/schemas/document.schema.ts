/**
 * Konstanta dokumen.
 *
 * Tinggal di sini, BUKAN di file action, karena setiap export dari berkas
 * `"use server"` diperlakukan sebagai endpoint dan harus berupa fungsi async.
 * Sebuah array yang diekspor dari sana sampai ke client sebagai referensi
 * action — dan baru terlihat rusak saat komponen memanggil `.map()` di atasnya,
 * jauh dari tempat kesalahannya.
 */

export const DOCUMENT_CATEGORIES = [
  "LETTER",
  "PROPOSAL",
  "LPJ",
  "SK",
  "CERTIFICATE",
  "REPORT",
  "EVENT_DOCUMENTATION",
  "OTHER",
] as const;
export const DOCUMENT_VISIBILITIES = [
  "PRIVATE",
  "ORGANIZATION",
  "PUBLIC",
] as const;

export type DocumentVisibility = (typeof DOCUMENT_VISIBILITIES)[number];
