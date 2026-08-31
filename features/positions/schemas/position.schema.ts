import { z } from "zod";

export const positionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama jabatan minimal 2 karakter")
    .max(100, "Nama jabatan maksimal 100 karakter"),

  code: z
    .string()
    .trim()
    .max(30, "Kode maksimal 30 karakter")
    .transform((value) => (value.length === 0 ? null : value))
    .nullable(),

  description: z
    .string()
    .trim()
    .max(500, "Deskripsi maksimal 500 karakter")
    .transform((value) => (value.length === 0 ? null : value))
    .nullable(),

  // Menentukan urutan tampil struktur, dari Ketua ke bawah.
  sortOrder: z.coerce
    .number()
    .int("Urutan harus bilangan bulat")
    .min(0, "Urutan minimal 0")
    .max(9999, "Urutan maksimal 9999"),

  parentPositionId: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .refine(
      (value) => value === null || z.uuid().safeParse(value).success,
      "Jabatan induk tidak valid",
    ),
});

export type PositionInput = z.infer<typeof positionSchema>;

export const POSITION_FIELDS = [
  "name",
  "code",
  "description",
  "sortOrder",
  "parentPositionId",
] as const;
