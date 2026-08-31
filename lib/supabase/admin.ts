import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Supabase client dengan service role. MELEWATI SELURUH RLS.
 *
 * `import "server-only"` membuat build gagal bila berkas ini pernah masuk ke
 * client bundle — pagar paling awal terhadap kebocoran service role.
 *
 * Penggunaan yang dibenarkan SANGAT sempit:
 *
 *   1. Menulis `audit_logs`. Tabel audit sengaja tidak punya INSERT policy
 *      supaya browser tidak dapat mengarang event palsu (docs/RLS.md §117),
 *      jadi penulisannya memang harus lewat jalur sistem.
 *   2. Agregat lintas organisasi untuk dashboard platform, yang menurut
 *      desain tidak diberikan sebagai hak baca kepada siapa pun
 *      (docs/PERMISSIONS.md §47).
 *
 * Yang DILARANG: memakai client ini untuk menembus policy yang gagal. Policy
 * yang salah diperbaiki, bukan dilangkahi (AGENTS.md §19-§20).
 */
export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv();

  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        // Client sistem tidak boleh mewarisi atau menyimpan session siapa pun.
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
