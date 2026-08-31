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
