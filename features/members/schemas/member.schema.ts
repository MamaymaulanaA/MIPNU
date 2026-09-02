import { z } from "zod";

export const MEMBER_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "ALUMNI",
  "TRANSFERRED",
  "DECEASED",
  "OTHER",
] as const;

export const MEMBER_GENDERS = ["L", "P"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter`)
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

/**
 * Skema pembuatan anggota.
 *
 * `organization_id` SENGAJA TIDAK ada di sini. Tenant tidak pernah datang dari
 * form — ia diresolusi server dari access context. Menerimanya dari client
 * berarti membuka jalan menulis data ke organisasi lain
 * (docs/AUTHORIZATION.md §17).
 */
export const createMemberSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Nama lengkap minimal 2 karakter")
    .max(150, "Nama lengkap maksimal 150 karakter"),

  memberNumber: optionalText(50),

  gender: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .refine(
      (value) =>
        value === null || (MEMBER_GENDERS as readonly string[]).includes(value),
      "Jenis kelamin tidak valid",
    ),

  birthPlace: optionalText(100),
  birthDate: optionalDate,

  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .refine(
      (value) => value === null || z.email().safeParse(value).success,
      "Format email tidak valid",
    ),

  phone: optionalText(30),
  address: optionalText(255),

  joinDate: optionalDate,

  status: z.enum(MEMBER_STATUSES, { error: "Status tidak valid" }),

  notes: optionalText(1000),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;

/**
 * Parameter listing.
 *
 * `sort` berupa enum, bukan string bebas: kolom pengurutan tidak boleh
 * ditentukan browser secara arbitrer (SYSTEM.md §65).
 */
export const memberListParamsSchema = z.object({
  search: z.string().trim().max(100).optional().default(""),
  status: z
    .union([z.enum(MEMBER_STATUSES), z.literal("")])
    .optional()
    .default(""),
  sort: z
    .enum(["full_name", "member_number", "join_date", "created_at"])
    .optional()
    .default("full_name"),
  direction: z.enum(["asc", "desc"]).optional().default("asc"),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
});

export type MemberListParams = z.infer<typeof memberListParamsSchema>;

export const MEMBERS_PAGE_SIZE = 20;
