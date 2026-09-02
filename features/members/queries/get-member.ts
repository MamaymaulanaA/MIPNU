import "server-only";

import { createClient } from "@/lib/supabase/server";

export type MemberDetail = {
  id: string;
  organizationId: string;
  memberNumber: string | null;
  fullName: string;
  gender: string | null;
  birthPlace: string | null;
  birthDate: string | null;
  joinDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export type MemberStatusHistoryEntry = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  changedAt: string;
  changedByName: string | null;
};

export type MemberAssignment = {
  id: string;
  positionName: string;
  periodName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
};

/**
 * Detail satu anggota.
 *
 * Tidak perlu memfilter organisasi secara manual — policy `members_select`
 * hanya meloloskan baris pada organisasi yang dapat diakses pemanggil,
 * sehingga id milik tenant lain menghasilkan NULL, bukan data
 * (docs/ARCHITECTURE.md §81).
 *
 * Kolom pribadi dipangkas di sini, bukan di RLS: RLS bekerja per baris,
 * bukan per kolom (docs/RLS.md §39).
 */
export async function getMember(
  memberId: string,
  options: { includePrivate: boolean },
): Promise<MemberDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("members")
    .select(
      `
      id, organization_id, member_number, full_name, gender,
      birth_place, birth_date, join_date, status, notes, created_at,
      email, phone, address
    `,
    )
    .eq("id", memberId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[mipnu] gagal memuat anggota", error.message);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    organizationId: data.organization_id,
    memberNumber: data.member_number,
    fullName: data.full_name,
    gender: data.gender,
    birthPlace: data.birth_place,
    birthDate: data.birth_date,
    joinDate: data.join_date,
    status: data.status,
    notes: data.notes,
    createdAt: data.created_at,
    email: options.includePrivate ? data.email : null,
    phone: options.includePrivate ? data.phone : null,
    address: options.includePrivate ? data.address : null,
  };
}

export async function getMemberStatusHistory(
  memberId: string,
): Promise<MemberStatusHistoryEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("member_status_history")
    .select(
      "id, from_status, to_status, reason, changed_at, profiles ( display_name )",
    )
    .eq("member_id", memberId)
    .order("changed_at", { ascending: false });

  if (error) {
    console.error("[mipnu] gagal memuat riwayat status", error.message);
    return [];
  }

  type Row = {
    id: string;
    from_status: string | null;
    to_status: string;
    reason: string | null;
    changed_at: string;
    profiles: { display_name: string } | null;
  };

  return (data as unknown as Row[]).map((row) => ({
    id: row.id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    reason: row.reason,
    changedAt: row.changed_at,
    changedByName: row.profiles?.display_name ?? null,
  }));
}

export async function getMemberAssignments(
  memberId: string,
): Promise<MemberAssignment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("management_assignments")
    .select(
      `
      id, status, start_date, end_date,
      positions!inner ( name ),
      organization_periods!inner ( name, start_date )
    `,
    )
    .eq("member_id", memberId);

  if (error) {
    console.error("[mipnu] gagal memuat riwayat jabatan", error.message);
    return [];
  }

  type Row = {
    id: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    positions: { name: string };
    organization_periods: { name: string; start_date: string };
  };

  return (data as unknown as Row[])
    .map((row) => ({
      id: row.id,
      positionName: row.positions.name,
      periodName: row.organization_periods.name,
      periodStart: row.organization_periods.start_date,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
    }))
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
    .map(({ periodStart: _periodStart, ...rest }) => rest);
}
