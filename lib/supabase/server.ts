import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Supabase client untuk Server Component, Server Action, dan Route Handler.
 *
 * Tetap memakai anon key + session user, BUKAN service role. Ini disengaja:
 * seluruh query alur pengguna biasa harus melewati RLS sehingga isolasi
 * tenant tetap ditegakkan database, bukan sekadar oleh kode aplikasi
 * (SYSTEM.md §15, §30).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component tidak boleh menulis cookie. Aman diabaikan:
            // middleware sudah menyegarkan session pada setiap request.
          }
        },
      },
    },
  );
}
