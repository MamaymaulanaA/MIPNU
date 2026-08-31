import type { ZodError, ZodType } from "zod";

import type { ActionResult } from "@/lib/errors";

/**
 * Jembatan antara FormData, Zod, dan bentuk hasil Server Action.
 *
 * Dipisah karena pola ini berulang di setiap mutasi. Menyalinnya belasan kali
 * berarti belasan kesempatan untuk lupa memetakan error ke field yang benar,
 * dan form yang menolak diam-diam lebih buruk daripada form yang error.
 */

/** Mengubah issue Zod menjadi peta field -> daftar pesan untuk render inline. */
export function toFieldErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }

  return fieldErrors;
}

export function validationFailure(error: ZodError): ActionResult<never> {
  return {
    success: false,
    error: "Periksa kembali isian Anda.",
    kind: "VALIDATION",
    fieldErrors: toFieldErrors(error),
  };
}

/**
 * Memvalidasi FormData terhadap sebuah skema.
 *
 * Mengembalikan discriminated union sehingga pemanggil tidak dapat memakai
 * data yang belum tervalidasi tanpa memeriksa `ok` lebih dulu.
 */
export function parseForm<T>(
  schema: ZodType<T>,
  formData: FormData,
  fields: readonly string[],
): { ok: true; data: T } | { ok: false; result: ActionResult<never> } {
  const raw: Record<string, unknown> = {};

  for (const field of fields) {
    const value = formData.get(field);
    // FormData mengembalikan null untuk field yang tidak dikirim sama sekali
    // (mis. checkbox tidak dicentang). Dinormalkan ke string kosong supaya
    // transform "kosong -> null" di skema bekerja seragam.
    raw[field] = value === null ? "" : value;
  }

  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false, result: validationFailure(parsed.error) };
  }

  return { ok: true, data: parsed.data };
}

/** Mengambil seluruh nilai sebuah field multi-value (mis. daftar checkbox). */
export function formValues(formData: FormData, field: string): string[] {
  return formData
    .getAll(field)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

/**
 * Menerjemahkan error Postgres menjadi pesan yang aman dan berguna.
 *
 * Kode SQLSTATE dipakai, bukan mencocokkan teks pesan — teks dapat berubah
 * antarversi Postgres, kode tidak. Detail aslinya tidak pernah sampai ke
 * pengguna (SYSTEM.md §58).
 */
export function databaseFailure(
  error: { code?: string; message: string },
  overrides: Partial<Record<string, ActionResult<never>>> = {},
): ActionResult<never> {
  const override = error.code ? overrides[error.code] : undefined;
  if (override) return override;

  switch (error.code) {
    case "23505": // unique_violation
      return {
        success: false,
        error: "Data serupa sudah ada.",
        kind: "CONFLICT",
      };
    case "23503": // foreign_key_violation
      return {
        success: false,
        error: "Data terkait tidak ditemukan atau masih digunakan.",
        kind: "CONFLICT",
      };
    case "23514": // check_violation
      return {
        success: false,
        error: "Data tidak memenuhi aturan yang berlaku.",
        kind: "VALIDATION",
      };
    case "42501": // insufficient_privilege
      return {
        success: false,
        error: "Anda tidak memiliki akses untuk tindakan ini.",
        kind: "FORBIDDEN",
      };
    default:
      console.error("[mipnu] database error", error.code, error.message);
      return {
        success: false,
        error: "Gagal menyimpan data. Silakan coba lagi.",
        kind: "DATABASE",
      };
  }
}
