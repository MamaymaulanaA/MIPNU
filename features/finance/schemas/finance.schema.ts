import { z } from "zod";

import { parseRupiah } from "@/lib/format";

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;
export const TRANSACTION_STATUSES = ["DRAFT", "POSTED", "VOID"] as const;
export const ACCOUNT_TYPES = ["CASH", "BANK", "OTHER"] as const;
export const BUDGET_STATUSES = ["DRAFT", "APPROVED", "CLOSED"] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];
export type BudgetStatus = (typeof BUDGET_STATUSES)[number];

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

const rupiah = z
  .string()
  .trim()
  .transform((value) => parseRupiah(value))
  .refine(
    (value): value is number => value !== null && value > 0,
    "Nominal harus angka lebih dari nol, mis. 150.000",
  );

const isoDate = z
  .string()
  .trim()
  .min(1, "Tanggal wajib diisi")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Tanggal tidak valid");

export const accountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama akun minimal 2 karakter")
    .max(120, "Nama akun maksimal 120 karakter"),
  description: optionalText(500),
  accountType: z.enum(ACCOUNT_TYPES, { error: "Jenis akun tidak valid" }),
  openingBalance: z
    .string()
    .trim()
    .transform((value) => {
      if (value.length === 0) return 0;
      const negative = value.trimStart().startsWith("-");
      const parsed = parseRupiah(negative ? value.replace("-", "") : value);
      return parsed === null ? null : negative ? -parsed : parsed;
    })
    .refine(
      (value): value is number => value !== null,
      "Saldo awal harus angka, mis. 1.000.000",
    ),
});

export const ACCOUNT_FIELDS = [
  "name",
  "description",
  "accountType",
  "openingBalance",
] as const;

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama kategori minimal 2 karakter")
    .max(120, "Nama kategori maksimal 120 karakter"),
  type: z.enum(TRANSACTION_TYPES, { error: "Jenis kategori tidak valid" }),
  description: optionalText(500),
});

export const CATEGORY_FIELDS = ["name", "type", "description"] as const;

export const transactionSchema = z.object({
  transactionType: z.enum(TRANSACTION_TYPES, {
    error: "Jenis transaksi tidak valid",
  }),
  accountId: z.uuid({ error: "Akun kas wajib dipilih" }),
  categoryId: optionalUuid,
  transactionDate: isoDate,
  amount: rupiah,
  description: z
    .string()
    .trim()
    .min(3, "Keterangan minimal 3 karakter")
    .max(500, "Keterangan maksimal 500 karakter"),
  referenceNumber: optionalText(120),
  organizationPeriodId: optionalUuid,
  proofDocumentId: optionalUuid,
});

export const TRANSACTION_FIELDS = [
  "transactionType",
  "accountId",
  "categoryId",
  "transactionDate",
  "amount",
  "description",
  "referenceNumber",
  "organizationPeriodId",
  "proofDocumentId",
] as const;

export const budgetSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Nama anggaran minimal 3 karakter")
      .max(160, "Nama anggaran maksimal 160 karakter"),
    description: optionalText(1000),
    organizationPeriodId: z.uuid({ error: "Periode wajib dipilih" }),
    startDate: z
      .string()
      .trim()
      .transform((value) => (value.length === 0 ? null : value))
      .nullable(),
    endDate: z
      .string()
      .trim()
      .transform((value) => (value.length === 0 ? null : value))
      .nullable(),
  })
  .refine(
    (value) =>
      value.endDate === null ||
      value.startDate === null ||
      Date.parse(value.endDate) >= Date.parse(value.startDate),
    { message: "Tanggal akhir harus setelah tanggal mulai", path: ["endDate"] },
  );

export const BUDGET_FIELDS = [
  "name",
  "description",
  "organizationPeriodId",
  "startDate",
  "endDate",
] as const;

export const budgetItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama rincian minimal 2 karakter")
    .max(160, "Nama rincian maksimal 160 karakter"),
  categoryId: optionalUuid,
  plannedAmount: rupiah,
  notes: optionalText(500),
});

export const BUDGET_ITEM_FIELDS = [
  "name",
  "categoryId",
  "plannedAmount",
  "notes",
] as const;

export const reportFilterSchema = z
  .object({
    start: z.string().trim().nullable().optional(),
    end: z.string().trim().nullable().optional(),
    accountId: z.string().trim().nullable().optional(),
    periodId: z.string().trim().nullable().optional(),
  })
  .refine(
    (value) =>
      !value.start ||
      !value.end ||
      Date.parse(value.start) <= Date.parse(value.end),
    { message: "Tanggal awal tidak boleh melewati tanggal akhir" },
  );
