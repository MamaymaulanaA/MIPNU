import type { BadgeTone } from "@/components/ui/badge";

type StatusPresentation = { label: string; tone: BadgeTone };

function present(
  map: Record<string, StatusPresentation>,
): (status: string) => StatusPresentation {
  return (status) => map[status] ?? { label: status, tone: "neutral" };
}

export const memberStatus = present({
  ACTIVE: { label: "Aktif", tone: "success" },
  INACTIVE: { label: "Nonaktif", tone: "neutral" },
  ALUMNI: { label: "Alumni", tone: "info" },
  TRANSFERRED: { label: "Pindah", tone: "warning" },
  DECEASED: { label: "Wafat", tone: "neutral" },
  OTHER: { label: "Lainnya", tone: "neutral" },
});

export const organizationStatus = present({
  ACTIVE: { label: "Aktif", tone: "success" },
  INACTIVE: { label: "Nonaktif", tone: "neutral" },
  SUSPENDED: { label: "Ditangguhkan", tone: "warning" },
  ARCHIVED: { label: "Diarsipkan", tone: "neutral" },
});

export const periodStatus = present({
  DRAFT: { label: "Draf", tone: "neutral" },
  ACTIVE: { label: "Aktif", tone: "success" },
  CLOSED: { label: "Ditutup", tone: "neutral" },
  ARCHIVED: { label: "Diarsipkan", tone: "neutral" },
});

export const eventStatus = present({
  DRAFT: { label: "Draf", tone: "neutral" },
  PUBLISHED: { label: "Terbit", tone: "info" },
  REGISTRATION_OPEN: { label: "Pendaftaran dibuka", tone: "success" },
  REGISTRATION_CLOSED: { label: "Pendaftaran ditutup", tone: "warning" },
  ONGOING: { label: "Berlangsung", tone: "primary" },
  COMPLETED: { label: "Selesai", tone: "neutral" },
  CANCELLED: { label: "Dibatalkan", tone: "destructive" },
});

export const attendanceStatus = present({
  PRESENT: { label: "Hadir", tone: "success" },
  PERMITTED: { label: "Izin", tone: "warning" },
  ABSENT: { label: "Alfa", tone: "destructive" },
});

export const participantStatus = present({
  REGISTERED: { label: "Terdaftar", tone: "info" },
  CONFIRMED: { label: "Dikonfirmasi", tone: "success" },
  CANCELLED: { label: "Dibatalkan", tone: "neutral" },
  WAITLISTED: { label: "Daftar tunggu", tone: "warning" },
});

export const managementStatus = present({
  ACTIVE: { label: "Aktif", tone: "success" },
  ENDED: { label: "Berakhir", tone: "neutral" },
  REVOKED: { label: "Dicabut", tone: "destructive" },
});

/**
 * Role sengaja bernada halus. Role bukan hiasan — badge-nya tidak boleh
 * berteriak lebih keras daripada data (docs/UI.md §113).
 */
export const roleStatus = present({
  SUPER_ADMIN: { label: "Super Admin", tone: "primary" },
  OPERATOR_ORGANISASI: { label: "Operator", tone: "info" },
  PENGURUS: { label: "Pengurus", tone: "primary" },
  ANGGOTA: { label: "Anggota", tone: "neutral" },
});

export const agendaType = present({
  MEETING: { label: "Rapat", tone: "info" },
  EVENT: { label: "Kegiatan", tone: "primary" },
  PROGRAM: { label: "Program Kerja", tone: "info" },
  CADRESHIP: { label: "Kaderisasi", tone: "primary" },
  ELECTION: { label: "Pemilihan", tone: "warning" },
  DEADLINE: { label: "Tenggat", tone: "destructive" },
  OTHER: { label: "Lainnya", tone: "neutral" },
});

export const cadreshipStatus = present({
  REGISTERED: { label: "Terdaftar", tone: "info" },
  PARTICIPATED: { label: "Mengikuti", tone: "primary" },
  PASSED: { label: "Lulus", tone: "success" },
  NOT_PASSED: { label: "Tidak lulus", tone: "destructive" },
  VERIFIED: { label: "Terverifikasi", tone: "success" },
});

export const programStatus = present({
  DRAFT: { label: "Draf", tone: "neutral" },
  PLANNED: { label: "Direncanakan", tone: "info" },
  ONGOING: { label: "Berjalan", tone: "primary" },
  COMPLETED: { label: "Selesai", tone: "success" },
  CANCELLED: { label: "Dibatalkan", tone: "destructive" },
});

export const meetingStatus = present({
  SCHEDULED: { label: "Terjadwal", tone: "info" },
  ONGOING: { label: "Berlangsung", tone: "primary" },
  COMPLETED: { label: "Selesai", tone: "neutral" },
  CANCELLED: { label: "Dibatalkan", tone: "destructive" },
});

export const meetingAttendance = present({
  INVITED: { label: "Diundang", tone: "neutral" },
  PRESENT: { label: "Hadir", tone: "success" },
  PERMITTED: { label: "Izin", tone: "warning" },
  ABSENT: { label: "Alfa", tone: "destructive" },
});

export const incomingLetterStatus = present({
  RECEIVED: { label: "Diterima", tone: "info" },
  PROCESSED: { label: "Diproses", tone: "primary" },
  ARCHIVED: { label: "Diarsipkan", tone: "neutral" },
});

export const outgoingLetterStatus = present({
  DRAFT: { label: "Draf", tone: "neutral" },
  APPROVED: { label: "Disetujui", tone: "success" },
  SENT: { label: "Terkirim", tone: "primary" },
  ARCHIVED: { label: "Diarsipkan", tone: "neutral" },
});

export const documentVisibility = present({
  PRIVATE: { label: "Privat", tone: "destructive" },
  ORGANIZATION: { label: "Organisasi", tone: "info" },
  PUBLIC: { label: "Publik", tone: "success" },
});

export const announcementStatus = present({
  DRAFT: { label: "Draf", tone: "neutral" },
  PUBLISHED: { label: "Terbit", tone: "success" },
  ARCHIVED: { label: "Diarsipkan", tone: "neutral" },
});

export const announcementAudience = present({
  ALL_MEMBERS: { label: "Semua anggota", tone: "info" },
  PENGURUS: { label: "Pengurus", tone: "primary" },
});

export const transactionStatus = present({
  DRAFT: { label: "Draf", tone: "neutral" },
  POSTED: { label: "Diposting", tone: "success" },
  VOID: { label: "Dibatalkan", tone: "destructive" },
});

export const transactionType = present({
  INCOME: { label: "Pemasukan", tone: "success" },
  EXPENSE: { label: "Pengeluaran", tone: "destructive" },
});

export const accountType = present({
  CASH: { label: "Kas Tunai", tone: "info" },
  BANK: { label: "Bank", tone: "primary" },
  OTHER: { label: "Lainnya", tone: "neutral" },
});

export const budgetStatus = present({
  DRAFT: { label: "Draf", tone: "neutral" },
  APPROVED: { label: "Disetujui", tone: "success" },
  CLOSED: { label: "Ditutup", tone: "neutral" },
});

export const electionStatus = present({
  DRAFT: { label: "Rancangan", tone: "neutral" },
  REGISTRATION: { label: "Pendaftaran", tone: "info" },
  SCHEDULED: { label: "Terjadwal", tone: "info" },
  OPEN: { label: "Berlangsung", tone: "primary" },
  CLOSED: { label: "Ditutup", tone: "warning" },
  PUBLISHED: { label: "Hasil Resmi", tone: "success" },
  ARCHIVED: { label: "Diarsipkan", tone: "neutral" },
  CANCELLED: { label: "Dibatalkan", tone: "destructive" },
});

export const candidateStatus = present({
  ACTIVE: { label: "Aktif", tone: "success" },
  WITHDRAWN: { label: "Mengundurkan diri", tone: "neutral" },
  DISQUALIFIED: { label: "Didiskualifikasi", tone: "destructive" },
});

export const voterStatus = present({
  VOTED: { label: "Sudah memilih", tone: "success" },
  NOT_VOTED: { label: "Belum memilih", tone: "neutral" },
  INELIGIBLE: { label: "Tidak berhak", tone: "destructive" },
});
