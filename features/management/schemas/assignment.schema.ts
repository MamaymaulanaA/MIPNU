import { z } from "zod";

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .refine(
    (value) => value === null || !Number.isNaN(Date.parse(value)),
    "Tanggal tidak valid",
  );

export const assignmentSchema = z
  .object({
    organizationPeriodId: z.uuid({ error: "Periode wajib dipilih" }),
    memberId: z.uuid({ error: "Anggota wajib dipilih" }),
    positionId: z.uuid({ error: "Jabatan wajib dipilih" }),

    startDate: optionalDate,
    endDate: optionalDate,
  })
  .refine(
    (value) =>
      value.endDate === null ||
      value.startDate === null ||
      Date.parse(value.endDate) >= Date.parse(value.startDate),
    {
      message: "Tanggal berakhir harus setelah tanggal mulai",
      path: ["endDate"],
    },
  );

export type AssignmentInput = z.infer<typeof assignmentSchema>;

export const ASSIGNMENT_FIELDS = [
  "organizationPeriodId",
  "memberId",
  "positionId",
  "startDate",
  "endDate",
] as const;
