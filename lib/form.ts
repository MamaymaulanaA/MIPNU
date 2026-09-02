import type { ZodError, ZodType } from "zod";

import type { ActionResult } from "@/lib/errors";

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

export function parseForm<T>(
  schema: ZodType<T>,
  formData: FormData,
  fields: readonly string[],
): { ok: true; data: T } | { ok: false; result: ActionResult<never> } {
  const raw: Record<string, unknown> = {};

  for (const field of fields) {
    const value = formData.get(field);
    raw[field] = value === null ? "" : value;
  }

  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false, result: validationFailure(parsed.error) };
  }

  return { ok: true, data: parsed.data };
}

export function formValues(formData: FormData, field: string): string[] {
  return formData
    .getAll(field)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

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
