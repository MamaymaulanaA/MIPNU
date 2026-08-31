import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.types";

export type AuditEntry = {
  actorProfileId: string | null;
  organizationId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, Json>;
};

/**
 * Mencatat aktivitas sensitif ke `audit_logs`.
 *
 * Memakai admin client secara sengaja: tabel audit tidak punya INSERT policy
 * untuk `authenticated`, supaya browser tidak dapat mengarang event palsu
 * (docs/RLS.md §117). Aktor TIDAK diambil dari input pemanggil sembarangan —
 * pemanggil mengisinya dari access context yang sudah diresolusi server.
 *
 * Kegagalan audit tidak boleh menggagalkan operasi bisnis yang sudah
 * berhasil: kegagalannya dicatat ke log aplikasi, bukan dilempar ke pengguna.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const requestHeaders = await headers();

    const supabase = createAdminClient();

    const { error } = await supabase.from("audit_logs").insert({
      actor_profile_id: entry.actorProfileId,
      organization_id: entry.organizationId,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId ?? null,
      metadata: (entry.metadata ?? null) as Json,
      ip_hash: hashIp(
        requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      ),
      user_agent_summary: summarizeUserAgent(requestHeaders.get("user-agent")),
    });

    if (error) {
      console.error("[mipnu] gagal menulis audit log", error.message);
    }
  } catch (error) {
    console.error("[mipnu] gagal menulis audit log", error);
  }
}

/**
 * Menyimpan hash, bukan IP mentah (docs/DATABASE.md §128).
 *
 * Cukup untuk mengelompokkan aktivitas dari sumber yang sama saat menyelidiki
 * insiden, tanpa menyimpan alamat yang dapat langsung mengidentifikasi orang.
 */
function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/** Ringkasan kasar user agent. String mentah terlalu panjang dan bising. */
function summarizeUserAgent(userAgent: string | null): string | null {
  if (!userAgent) return null;
  return userAgent.slice(0, 120);
}
