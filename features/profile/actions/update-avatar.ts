"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth/context";
import { AppError, fail, ok, type ActionResult } from "@/lib/errors";
import { databaseFailure } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

const MAX_BYTES = 2 * 1024 * 1024;

export async function updateOwnAvatar(
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireProfile();
    const file = formData.get("avatar");

    if (!(file instanceof File) || file.size === 0) {
      throw new AppError("VALIDATION", "Pilih berkas gambar terlebih dahulu.");
    }

    const extension = ALLOWED_TYPES.get(file.type);
    if (!extension) {
      throw new AppError("VALIDATION", "Format harus PNG, JPG, atau WebP.");
    }

    if (file.size > MAX_BYTES) {
      throw new AppError("VALIDATION", "Ukuran gambar maksimal 2 MB.");
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError("UNAUTHENTICATED", "Sesi tidak ditemukan.");
    }

    const path = `${user.id}/${Date.now()}.${extension}`;

    const uploaded = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploaded.error) {
      console.error("[mipnu] gagal mengunggah avatar", uploaded.error.message);
      throw new AppError(
        "INTERNAL",
        "Gambar tidak dapat diunggah. Coba lagi beberapa saat.",
      );
    }

    const previousPath = profile.avatar_path;

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_path: path })
      .eq("id", profile.id);

    if (error) {
      await supabase.storage.from("avatars").remove([path]);
      return databaseFailure(error);
    }

    if (previousPath && previousPath !== path) {
      await supabase.storage.from("avatars").remove([previousPath]);
    }

    revalidatePath("/profil");
    revalidatePath("/", "layout");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function removeOwnAvatar(): Promise<ActionResult<void>> {
  try {
    const profile = await requireProfile();

    if (!profile.avatar_path) return ok();

    const supabase = await createClient();

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_path: null })
      .eq("id", profile.id);

    if (error) return databaseFailure(error);

    await supabase.storage.from("avatars").remove([profile.avatar_path]);

    revalidatePath("/profil");
    revalidatePath("/", "layout");

    return ok();
  } catch (error) {
    return fail(error);
  }
}
