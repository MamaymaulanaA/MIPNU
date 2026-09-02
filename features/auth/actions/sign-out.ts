"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { ORGANIZATION_COOKIE } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(ORGANIZATION_COOKIE);

  redirect("/login");
}
