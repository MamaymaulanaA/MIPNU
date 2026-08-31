"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireProfile } from "@/lib/auth/context";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { databaseFailure, parseForm } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter"),
});

/**
 * Memperbarui profil sendiri.
 *
 * HANYA `display_name`. Kolom istimewa — `status` dan `auth_user_id` —
 * dijaga trigger `app_private.protect_profile_privileged_columns()`, jadi
 * membatasi daftar field di sini bukan satu-satunya pengaman: mengirim
 * payload tambahan pun akan ditolak database (docs/RLS.md §17).
 *
 * Baris yang disasar ditentukan `auth.uid()`, bukan id dari client.
 */
export async function updateOwnProfile(
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireProfile();

    const parsed = parseForm(profileSchema, formData, ["displayName"]);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: parsed.data.displayName })
      .eq("id", profile.id);

    if (error) return databaseFailure(error);

    revalidatePath("/profil");
    revalidatePath("/", "layout");

    return ok();
  } catch (error) {
    return fail(error);
  }
}
