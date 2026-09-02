import { z } from "zod";

export const EVENT_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "REGISTRATION_OPEN",
  "REGISTRATION_CLOSED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
] as const;

export const EVENT_VISIBILITIES = ["ORGANIZATION", "PENGURUS"] as const;

export const PARTICIPANT_STATUSES = [
  "REGISTERED",
  "CONFIRMED",
  "CANCELLED",
  "WAITLISTED",
] as const;

const optionalDateTime = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .refine(
    (value) => value === null || !Number.isNaN(Date.parse(value)),
    "Waktu tidak valid",
  );

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter`)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable();

export const eventSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Nama event minimal 3 karakter")
      .max(150, "Nama event maksimal 150 karakter"),

    description: optionalText(2000),

    startAt: z
      .string()
      .trim()
      .min(1, "Waktu mulai wajib diisi")
      .refine((value) => !Number.isNaN(Date.parse(value)), "Waktu tidak valid"),

    endAt: optionalDateTime,

    location: optionalText(200),

    capacity: z
      .string()
      .trim()
      .transform((value) => (value.length === 0 ? null : Number(value)))
      .nullable()
      .refine(
        (value) => value === null || (Number.isInteger(value) && value > 0),
        "Kapasitas harus bilangan bulat lebih dari 0",
      ),

    registrationStartAt: optionalDateTime,
    registrationEndAt: optionalDateTime,

    status: z.enum(EVENT_STATUSES, { error: "Status tidak valid" }),
    visibility: z.enum(EVENT_VISIBILITIES, {
      error: "Visibilitas tidak valid",
    }),
  })
  .refine(
    (value) =>
      value.endAt === null ||
      Date.parse(value.endAt) >= Date.parse(value.startAt),
    { message: "Waktu selesai harus setelah waktu mulai", path: ["endAt"] },
  )
  .refine(
    (value) =>
      value.registrationEndAt === null ||
      value.registrationStartAt === null ||
      Date.parse(value.registrationEndAt) >=
        Date.parse(value.registrationStartAt),
    {
      message: "Penutupan pendaftaran harus setelah pembukaan",
      path: ["registrationEndAt"],
    },
  );

export type EventInput = z.infer<typeof eventSchema>;

export const EVENT_FIELDS = [
  "name",
  "description",
  "startAt",
  "endAt",
  "location",
  "capacity",
  "registrationStartAt",
  "registrationEndAt",
  "status",
  "visibility",
] as const;

export const committeeSchema = z.object({
  memberId: z.uuid({ error: "Anggota wajib dipilih" }),
  positionName: z
    .string()
    .trim()
    .min(2, "Nama tugas minimal 2 karakter")
    .max(100, "Nama tugas maksimal 100 karakter"),
});

export const COMMITTEE_FIELDS = ["memberId", "positionName"] as const;
