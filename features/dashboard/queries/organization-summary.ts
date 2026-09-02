import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Setiap bagian bernilai NULL bila pemanggil tidak berhak melihatnya —
 * keputusan itu dibuat di dalam `mipnu_organization_stats()`, bukan di sini.
 * Aplikasi tidak boleh menerima angka lalu memutuskan menyembunyikannya;
 * angka yang tidak boleh dilihat memang tidak pernah dikirim.
 */
export type OrganizationStats = {
  members: { total: number; active: number; alumni: number } | null;
  management: { active: number } | null;
  agenda: { upcoming: number } | null;
  events: { upcoming: number; ongoing: number } | null;
  attendance: { sessions: number; present: number; expected: number } | null;
  programs: { ongoing: number; completed: number; total: number } | null;
  meetings: { upcoming: number } | null;
  letters: { incoming_30d: number; outgoing_draft: number } | null;
  announcements: { active: number } | null;
  finance: {
    balance: number;
    income_30d: number;
    expense_30d: number;
    draft_count: number;
  } | null;
  active_period: {
    name: string;
    start_date: string;
    end_date: string;
  } | null;
};

export type PlatformStats = {
  organizations: { total: number; active: number };
  by_type: { code: string; total: number }[];
  by_level: { code: string; hierarchy_rank: number; total: number }[];
  accounts: { total: number; active: number; unassigned: number };
  members_total: number;
};

export async function getOrganizationStats(
  organizationId: string,
): Promise<OrganizationStats | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("mipnu_organization_stats", {
    p_organization_id: organizationId,
  });

  if (error) {
    console.error("[mipnu] gagal memuat statistik organisasi", error.message);
    return null;
  }

  return data as unknown as OrganizationStats;
}

export async function getPlatformStats(): Promise<PlatformStats | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("mipnu_platform_stats");

  if (error) {
    if (error.code !== "42501") {
      console.error("[mipnu] gagal memuat statistik platform", error.message);
    }
    return null;
  }

  return data as unknown as PlatformStats;
}
