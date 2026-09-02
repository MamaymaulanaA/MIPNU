"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/errors";
import { parseForm } from "@/lib/form";

const requestSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi")
    .pipe(z.email("Format email tidak valid"))
    .transform((value) => value.toLowerCase()),
});

export async function requestPasswordReset(
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const parsed = parseForm(requestSchema, formData, ["email"]);
  if (!parsed.ok) return parsed.result;

  const supabase = await createClient();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${siteUrl}/auth/konfirmasi` },
  );

  if (error) {
    console.error("[mipnu] gagal mengirim tautan reset", error.message);
  }

  return { success: true, data: undefined };
}

const resetSchema = z
  .object({
    password: z
      .string()
      .min(12, "Kata sandi minimal 12 karakter")
      .max(128, "Kata sandi maksimal 128 karakter"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["confirmPassword"],
  });

export async function resetPassword(
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const parsed = parseForm(resetSchema, formData, [
    "password",
    "confirmPassword",
  ]);
  if (!parsed.ok) return parsed.result;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error:
        "Sesi pemulihan tidak ditemukan atau sudah kedaluwarsa. Minta tautan baru.",
      kind: "UNAUTHENTICATED",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
      kind: "VALIDATION",
      fieldErrors: { password: [error.message] },
    };
  }

  return { success: true, data: undefined };
}
