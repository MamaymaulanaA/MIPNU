import { z } from "zod";

/**
 * Konstanta & skema pemilihan.
 *
 * Tinggal di sini, BUKAN di berkas action: setiap export dari berkas
 * `"use server"` diperlakukan Next sebagai endpoint dan harus berupa fungsi
 * async (lihat tests/server-action-exports.test.ts).
 */

export const ELECTION_STATUSES = [
  "DRAFT",
  "REGISTRATION",
  "SCHEDULED",
  "OPEN",
  "CLOSED",
  "PUBLISHED",
  "ARCHIVED",
  "CANCELLED",
] as const;

export const ELECTION_TYPES = ["KETUA", "FORMATUR", "LAINNYA"] as const;

export const RESULT_VISIBILITIES = [
  "PRIVATE",
  "ORGANIZATION",
  "PUBLIC",
] as const;

export const CANDIDATE_STATUSES = [
  "ACTIVE",
  "WITHDRAWN",
  "DISQUALIFIED",
] as const;

export type ElectionStatus = (typeof ELECTION_STATUSES)[number];
export type ElectionType = (typeof ELECTION_TYPES)[number];
export type ResultVisibility = (typeof RESULT_VISIBILITIES)[number];
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

/** Label Indonesia untuk tiap status. Dipakai badge dan judul halaman. */
export const ELECTION_STATUS_LABEL: Record<ElectionStatus, string> = {
  DRAFT: "Rancangan",
  REGISTRATION: "Pendaftaran",
  SCHEDULED: "Terjadwal",
  OPEN: "Berlangsung",
  CLOSED: "Ditutup",
  PUBLISHED: "Hasil Resmi",
  ARCHIVED: "Diarsipkan",
  CANCELLED: "Dibatalkan",
};

export const ELECTION_TYPE_LABEL: Record<ElectionType, string> = {
  KETUA: "Pemilihan Ketua",
  FORMATUR: "Pemilihan Formatur",
  LAINNYA: "Lainnya",
};

export const RESULT_VISIBILITY_LABEL: Record<ResultVisibility, string> = {
  PRIVATE: "Hanya penyelenggara",
  ORGANIZATION: "Seluruh anggota organisasi",
  PUBLIC: "Publik",
};

export const CANDIDATE_STATUS_LABEL: Record<CandidateStatus, string> = {
  ACTIVE: "Aktif",
  WITHDRAWN: "Mengundurkan diri",
  DISQUALIFIED: "Didiskualifikasi",
};

/**
 * Status yang masih menerima penyuntingan biasa.
 *
 * Sama persis dengan daftar di trigger `app_private.guard_election()`. Kalau
 * keduanya berbeda, yang menang tetap database — ini hanya supaya tombolnya
 * tidak menawarkan sesuatu yang pasti ditolak.
 */
export const EDITABLE_STATUSES: readonly ElectionStatus[] = [
  "DRAFT",
  "REGISTRATION",
  "SCHEDULED",
];

/** Alasan penolakan dari `mipnu_cast_vote`, diterjemahkan seadanya. */
export const VOTE_FAILURE_MESSAGE: Record<string, string> = {
  NOT_AUTHENTICATED: "Sesi Anda berakhir. Masuk kembali untuk memilih.",
  INVALID_INPUT: "Permintaan tidak lengkap.",
  ELECTION_NOT_FOUND: "Pemilihan tidak ditemukan.",
  NOT_ELIGIBLE: "Anda tidak memiliki hak pilih pada pemilihan ini.",
  NOT_PERMITTED: "Anda tidak memiliki izin memilih.",
  NOT_IN_DPT: "Nama Anda tidak terdaftar dalam DPT pemilihan ini.",
  ALREADY_VOTED: "Anda sudah memberikan suara pada pemilihan ini.",
  ELECTION_NOT_OPEN: "Pemungutan suara belum dibuka.",
  VOTING_NOT_STARTED: "Pemungutan suara belum dimulai.",
  VOTING_ENDED: "Waktu pemungutan suara sudah berakhir.",
  INVALID_CANDIDATE: "Kandidat tidak valid untuk pemilihan ini.",
  CANDIDATE_UNAVAILABLE: "Kandidat tersebut sudah tidak dapat dipilih.",
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable();

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .refine(
    (value) => value === null || z.uuid().safeParse(value).success,
    "Pilihan tidak valid",
  );

/**
 * Waktu dari `<input type="datetime-local">`.
 *
 * Nilainya waktu lokal tanpa zona ("2026-09-01T08:00"). Diubah menjadi ISO
 * lengkap memakai zona peramban, bukan diperlakukan sebagai UTC — kalau tidak,
 * jadwal pemilihan bergeser tujuh jam dan tak seorang pun menyadarinya sampai
 * suara ditolak karena "belum dimulai".
 */
const localDateTime = z
  .string()
  .trim()
  .min(1, "Waktu wajib diisi")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Waktu tidak valid")
  .transform((value) => new Date(value).toISOString());

/* --------------------------------------------------------------- pemilihan */

export const electionSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Nama pemilihan minimal 3 karakter")
      .max(200, "Nama pemilihan maksimal 200 karakter"),
    description: optionalText(2000),
    electionType: z.enum(ELECTION_TYPES, { error: "Jenis tidak valid" }),
    organizationPeriodId: optionalUuid,
    startAt: localDateTime,
    endAt: localDateTime,
    resultVisibility: z.enum(RESULT_VISIBILITIES, {
      error: "Visibilitas hasil tidak valid",
    }),
  })
  .refine((value) => new Date(value.endAt) > new Date(value.startAt), {
    error: "Waktu selesai harus setelah waktu mulai",
    path: ["endAt"],
  });

export const ELECTION_FIELDS = [
  "name",
  "description",
  "electionType",
  "organizationPeriodId",
  "startAt",
  "endAt",
  "resultVisibility",
] as const;

/* ---------------------------------------------------------------- kandidat */

export const candidateSchema = z.object({
  memberId: optionalUuid,
  // Nomor urut ditentukan penyelenggara, bukan urutan input: undian nomor urut
  // adalah bagian dari prosesnya.
  candidateNumber: z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, "Nomor urut berupa angka 1-999")
    .transform((value) => Number(value))
    .refine((value) => value >= 1 && value <= 999, "Nomor urut 1-999"),
  displayName: z
    .string()
    .trim()
    .min(2, "Nama kandidat minimal 2 karakter")
    .max(200, "Nama kandidat maksimal 200 karakter"),
  vision: optionalText(2000),
  mission: optionalText(2000),
  profileText: optionalText(2000),
  status: z.enum(CANDIDATE_STATUSES, { error: "Status kandidat tidak valid" }),
});

export const CANDIDATE_FIELDS = [
  "memberId",
  "candidateNumber",
  "displayName",
  "vision",
  "mission",
  "profileText",
  "status",
] as const;

/* --------------------------------------------------------------- panitia */

export const committeeSchema = z.object({
  memberId: z.uuid({ error: "Anggota wajib dipilih" }),
  positionName: z
    .string()
    .trim()
    .min(2, "Jabatan panitia minimal 2 karakter")
    .max(100, "Jabatan panitia maksimal 100 karakter"),
});

/**
 * Hanya dua field yang dibaca `parseForm`.
 *
 * Daftar hak panitia datang sebagai checkbox berulang dan diambil terpisah
 * lewat `formValues`, lalu disaring terhadap
 * ASSIGNABLE_COMMITTEE_PERMISSIONS di bawah.
 */
export const COMMITTEE_FIELDS = ["memberId", "positionName"] as const;

/**
 * Hak yang boleh dilekatkan pada penugasan panitia.
 *
 * Sengaja TIDAK memuat elections.publish_result: PERMISSIONS.md §57 menyebutnya
 * secara khusus sebagai hal yang tidak otomatis diperoleh penyelenggara
 * pemilihan. Mempublikasikan hasil tetap keputusan organisasi, bukan panitia
 * teknis.
 */
export const ASSIGNABLE_COMMITTEE_PERMISSIONS = [
  "elections.view",
  "elections.manage_candidates",
  "elections.manage_voters",
  "elections.view_audit",
  "elections.view_result",
  "elections.open",
  "elections.close",
] as const;

/* ------------------------------------------------------------------- DPT */

export const voterSchema = z.object({
  memberIds: z.array(z.uuid()).min(1, "Pilih minimal satu anggota"),
});

export const voterEligibilitySchema = z.object({
  voterId: z.uuid(),
  eligible: z.enum(["true", "false"]).transform((value) => value === "true"),
  reason: optionalText(500),
});

/* ------------------------------------------------------------- pembatalan */

export const cancelSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Alasan pembatalan minimal 5 karakter")
    .max(500, "Alasan pembatalan maksimal 500 karakter"),
});
