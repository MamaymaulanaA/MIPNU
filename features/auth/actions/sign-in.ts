"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { signInSchema } from "@/features/auth/schemas/auth.schema";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/errors";

/**
 * Masuk dengan email + kata sandi.
 *
 * Pesan gagal sengaja seragam untuk email tidak dikenal maupun sandi salah,
 * supaya form ini tidak dapat dipakai memetakan email mana yang terdaftar.
 */
export async function signIn(
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (fieldErrors[key] ??= []).push(issue.message);
    }

    return {
      success: false,
      error: "Periksa kembali isian Anda.",
      kind: "VALIDATION",
      fieldErrors,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      success: false,
      error: "Email atau kata sandi salah.",
      kind: "UNAUTHENTICATED",
    };
  }

  // Tujuan redirect dibatasi ke path internal. Tanpa ini, `?redirect=` dapat
  // dipakai mengarahkan pengguna yang baru login ke situs luar.
  const requested = formData.get("redirect");
  const isSafeInternalPath =
    typeof requested === "string" &&
    requested.startsWith("/") &&
    !requested.startsWith("//");

  // Cast diperlukan karena typedRoutes tidak dapat memverifikasi string
  // runtime. Keamanannya berasal dari pemeriksaan di atas, bukan dari tipe.
  redirect(isSafeInternalPath ? (requested as Route) : "/dashboard");
}
