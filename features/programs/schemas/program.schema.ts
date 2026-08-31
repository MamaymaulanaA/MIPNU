/**
 * Konstanta program kerja.
 *
 * Tinggal di sini, BUKAN di file action, karena setiap export dari berkas
 * `"use server"` diperlakukan sebagai endpoint dan harus berupa fungsi async.
 * Sebuah array yang diekspor dari sana sampai ke client sebagai referensi
 * action — dan baru terlihat rusak saat komponen memanggil `.map()` di atasnya,
 * jauh dari tempat kesalahannya.
 */

export const PROGRAM_STATUSES = [
  "DRAFT",
  "PLANNED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];
