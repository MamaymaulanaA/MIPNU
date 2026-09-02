import { z } from "zod";

export const ORGANIZATION_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "ARCHIVED",
] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter`)
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

const baseOrganizationFields = {
  name: z
    .string()
    .trim()
    .min(3, "Nama organisasi minimal 3 karakter")
    .max(150, "Nama organisasi maksimal 150 karakter"),

  shortName: optionalText(60),

  address: optionalText(255),
  village: optionalText(100),
  district: optionalText(100),
  cityRegency: optionalText(100),
  province: optionalText(100),

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
  description: optionalText(1000),
};

export const createOrganizationSchema = z.object({
  ...baseOrganizationFields,

  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Slug minimal 3 karakter")
    .max(80, "Slug maksimal 80 karakter")
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Slug hanya boleh huruf kecil, angka, dan tanda hubung",
    ),

  organizationTypeId: z.uuid({ error: "Jenis organisasi wajib dipilih" }),
  organizationLevelId: z.uuid({ error: "Tingkat organisasi wajib dipilih" }),
  parentOrganizationId: optionalUuid,
});

export const updateOrganizationSchema = z.object({
  ...baseOrganizationFields,
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const CREATE_ORGANIZATION_FIELDS = [
  "name",
  "shortName",
  "slug",
  "organizationTypeId",
  "organizationLevelId",
  "parentOrganizationId",
  "address",
  "village",
  "district",
  "cityRegency",
  "province",
  "email",
  "phone",
  "description",
] as const;

export const UPDATE_ORGANIZATION_FIELDS = [
  "name",
  "shortName",
  "address",
  "village",
  "district",
  "cityRegency",
  "province",
  "email",
  "phone",
  "description",
] as const;
