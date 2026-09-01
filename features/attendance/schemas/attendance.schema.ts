/**
 * Konstanta domain presensi.
 *
 * Dipisahkan dari berkas action karena modul `"use server"` HANYA boleh
 * mengekspor async function. Mengekspor konstanta dari sana membuat modulnya
 * gagal dievaluasi saat runtime — kegagalan yang tidak tertangkap typecheck
 * maupun build, hanya muncul ketika halamannya dibuka.
 */
export const ATTENDANCE_STATUSES = ["PRESENT", "PERMITTED", "ABSENT"] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const SESSION_STATUSES = ["DRAFT", "OPEN", "CLOSED"] as const;

/**
 * Label status sesi, satu tempat untuk form maupun saringan.
 *
 * Diletakkan di berkas skema, BUKAN di komponen panel yang bertanda
 * `"use client"`. Ekspor dari modul klien yang diimpor Server Component
 * berubah menjadi referensi, bukan nilai — halaman Presensi sempat gagal
 * dimuat dengan "SESSION_STATUS_OPTIONS is not iterable" karena itu.
 */
export const SESSION_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draf" },
  { value: "OPEN", label: "Dibuka" },
  { value: "CLOSED", label: "Ditutup" },
] as const;
