import { z } from "zod";

export const AGENDA_TYPES = [
  "MEETING",
  "EVENT",
  "PROGRAM",
  "CADRESHIP",
  "ELECTION",
  "DEADLINE",
  "OTHER",
] as const;

export const AGENDA_VISIBILITIES = ["ORGANIZATION", "PENGURUS"] as const;

const optionalDateTime = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .refine(
    (value) => value === null || !Number.isNaN(Date.parse(value)),
    "Waktu tidak valid",
  );

export const agendaSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Judul minimal 3 karakter")
      .max(150, "Judul maksimal 150 karakter"),

    description: z
      .string()
      .trim()
      .max(1000, "Deskripsi maksimal 1000 karakter")
      .transform((value) => (value.length === 0 ? null : value))
      .nullable(),

    agendaType: z.enum(AGENDA_TYPES, { error: "Jenis agenda tidak valid" }),

    startAt: z
      .string()
      .trim()
      .min(1, "Waktu mulai wajib diisi")
      .refine((value) => !Number.isNaN(Date.parse(value)), "Waktu tidak valid"),

    endAt: optionalDateTime,

    location: z
      .string()
      .trim()
      .max(200, "Lokasi maksimal 200 karakter")
      .transform((value) => (value.length === 0 ? null : value))
      .nullable(),

    // PUBLIC sengaja tidak ditawarkan: Public Portal adalah Phase 5, dan
    // menandai sesuatu "publik" sebelum ada kanal publik hanya menciptakan
    // data yang statusnya tidak berarti apa-apa.
    visibility: z.enum(AGENDA_VISIBILITIES, {
      error: "Visibilitas tidak valid",
    }),
  })
  .refine(
    (value) =>
      value.endAt === null ||
      Date.parse(value.endAt) >= Date.parse(value.startAt),
    { message: "Waktu selesai harus setelah waktu mulai", path: ["endAt"] },
  );

export type AgendaInput = z.infer<typeof agendaSchema>;

export const AGENDA_FIELDS = [
  "title",
  "description",
  "agendaType",
  "startAt",
  "endAt",
  "location",
  "visibility",
] as const;
