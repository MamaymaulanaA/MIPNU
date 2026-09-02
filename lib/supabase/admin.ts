import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Supabase client service role. MELEWATI SELURUH RLS.
 *
 * `import "server-only"` menggagalkan build bila berkas ini masuk client bundle.
 * Dibenarkan hanya untuk dua hal: menulis `audit_logs` (tabelnya sengaja tanpa
 * INSERT policy, docs/RLS.md §117) dan agregat lintas organisasi dashboard
 * platform (docs/PERMISSIONS.md §47). BUKAN untuk menembus policy yang gagal —
 * policy yang salah diperbaiki (AGENTS.md §19-§20).
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
