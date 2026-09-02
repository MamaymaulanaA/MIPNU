import "server-only";

import { cache } from "react";

import { getCurrentProfile } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_SECONDS = 60 * 60;

export const getOwnAvatarUrl = cache(async (): Promise<string | null> => {
  const profile = await getCurrentProfile();
  if (!profile?.avatar_path) return null;

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from("avatars")
    .createSignedUrl(profile.avatar_path, SIGNED_URL_SECONDS);

  if (error) return null;

  return data.signedUrl;
});
