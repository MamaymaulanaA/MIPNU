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
