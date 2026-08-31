/**
 * Konstanta rapat.
 *
 * Tinggal di sini, BUKAN di file action, karena setiap export dari berkas
 * `"use server"` diperlakukan sebagai endpoint dan harus berupa fungsi async.
 * Sebuah array yang diekspor dari sana sampai ke client sebagai referensi
 * action — dan baru terlihat rusak saat komponen memanggil `.map()` di atasnya,
 * jauh dari tempat kesalahannya.
 */

export const MEETING_STATUSES = [
  "SCHEDULED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
] as const;

export const MEETING_ATTENDANCE = [
  "INVITED",
  "PRESENT",
  "PERMITTED",
  "ABSENT",
] as const;

export type MeetingAttendance = (typeof MEETING_ATTENDANCE)[number];
