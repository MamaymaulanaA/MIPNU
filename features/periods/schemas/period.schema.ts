import { z } from "zod";

const requiredDate = z
  .string()
  .trim()
  .min(1, "Tanggal wajib diisi")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Tanggal tidak valid");

/**
 * Periode kepengurusan.
 *
 * `organization_id` tidak ada di sini — tenant selalu berasal dari access
 * context server, tidak pernah dari form.
 */
export const periodSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Nama periode minimal 2 karakter")
      .max(80, "Nama periode maksimal 80 karakter"),

    startDate: requiredDate,
    endDate: requiredDate,
  })
  .refine((value) => Date.parse(value.endDate) > Date.parse(value.startDate), {
    message: "Tanggal selesai harus setelah tanggal mulai",
    path: ["endDate"],
  });

export type PeriodInput = z.infer<typeof periodSchema>;

export const PERIOD_FIELDS = ["name", "startDate", "endDate"] as const;

export const PERIOD_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "CLOSED",
  "ARCHIVED",
] as const;
