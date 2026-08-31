import { z } from "zod";

export const CADRESHIP_STATUSES = [
  "REGISTERED",
  "PARTICIPATED",
  "PASSED",
  "NOT_PASSED",
] as const;

/**
 * VERIFIED tidak ada dalam daftar di atas, dan itu disengaja.
 *
 * Verifikasi bukan pilihan pada dropdown yang sama dengan status lainnya: ia
 * tindakan tersendiri, menuntut permission tersendiri, dan meninggalkan jejak
 * siapa yang melakukannya. Menaruhnya di dropdown akan membuat "menyatakan
 * sah" tampak setara dengan "mengoreksi ketikan".
 */
export type CadreshipStatus = (typeof CADRESHIP_STATUSES)[number];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable();

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .refine(
    (value) => value === null || !Number.isNaN(Date.parse(value)),
    "Tanggal tidak valid",
  );

export const cadreshipRecordSchema = z
  .object({
    memberId: z.uuid({ error: "Anggota wajib dipilih" }),
    cadreshipTypeId: z.uuid({ error: "Jenjang wajib dipilih" }),
    activityName: z
      .string()
      .trim()
      .min(3, "Nama kegiatan minimal 3 karakter")
      .max(160, "Nama kegiatan maksimal 160 karakter"),
    organizer: optionalText(160),
    location: optionalText(160),
    startDate: optionalDate,
    endDate: optionalDate,
    status: z.enum(CADRESHIP_STATUSES, { error: "Status tidak valid" }),
    certificateNumber: optionalText(80),
    notes: optionalText(1000),
  })
  .refine(
    (value) =>
      value.endDate === null ||
      value.startDate === null ||
      Date.parse(value.endDate) >= Date.parse(value.startDate),
    {
      message: "Tanggal selesai harus setelah tanggal mulai",
      path: ["endDate"],
    },
  );

export const CADRESHIP_FIELDS = [
  "memberId",
  "cadreshipTypeId",
  "activityName",
  "organizer",
  "location",
  "startDate",
  "endDate",
  "status",
  "certificateNumber",
  "notes",
] as const;

export type CadreshipRecordInput = z.infer<typeof cadreshipRecordSchema>;
