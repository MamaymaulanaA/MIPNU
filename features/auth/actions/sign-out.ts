"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { ORGANIZATION_COOKIE } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

/**
 * Mengakhiri session.
 *
 * Cookie organisasi ikut dihapus supaya pengguna berikutnya di perangkat yang
 * sama tidak memulai sesi dengan konteks organisasi milik orang sebelumnya.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(ORGANIZATION_COOKIE);

  redirect("/login");
}
