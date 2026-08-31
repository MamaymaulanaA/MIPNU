/**
 * Konstanta surat.
 *
 * Tinggal di sini, BUKAN di file action, karena setiap export dari berkas
 * `"use server"` diperlakukan sebagai endpoint dan harus berupa fungsi async.
 * Sebuah array yang diekspor dari sana sampai ke client sebagai referensi
 * action — dan baru terlihat rusak saat komponen memanggil `.map()` di atasnya,
 * jauh dari tempat kesalahannya.
 */

export const INCOMING_STATUSES = ["RECEIVED", "PROCESSED", "ARCHIVED"] as const;
export const OUTGOING_STATUSES = [
  "DRAFT",
  "APPROVED",
  "SENT",
  "ARCHIVED",
] as const;

export type OutgoingStatus = (typeof OUTGOING_STATUSES)[number];
