import "server-only";

import {
  MEMBERS_PAGE_SIZE,
  type MemberListParams,
} from "@/features/members/schemas/member.schema";
import { createClient } from "@/lib/supabase/server";

/**
 * Baris anggota untuk tabel.
 *
 * Data pribadi (email, telepon, alamat, tanggal lahir) hanya ikut bila
 * pemanggil punya `members.view_private`. RLS bekerja per baris, bukan per
 * kolom, jadi privasi kolom ditegakkan di projection ini
 * (docs/RLS.md §39, PERMISSIONS.md §13).
 */
export type MemberListRow = {
  id: string;
  memberNumber: string | null;
  fullName: string;
  gender: string | null;
  status: string;
  joinDate: string | null;
  email: string | null;
  phone: string | null;
};

export type MemberListResult = {
  rows: MemberListRow[];
  total: number;
  page: number;
  pageCount: number;
};

export async function listMembers(
  organizationId: string,
  params: MemberListParams,
  options: { includePrivate: boolean },
): Promise<MemberListResult> {
  const supabase = await createClient();

  const from = (params.page - 1) * MEMBERS_PAGE_SIZE;
  const to = from + MEMBERS_PAGE_SIZE - 1;

  let query = supabase
    .from("members")
    .select(
      "id, member_number, full_name, gender, status, join_date, email, phone",
      {
        count: "exact",
      },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (params.status) {
    query = query.eq("status", params.status);
  }

  if (params.search) {
    const escaped = escapeLikePattern(params.search);
    query = query.or(
      `full_name.ilike.%${escaped}%,member_number.ilike.%${escaped}%`,
    );
  }

  const { data, count, error } = await query
    .order(params.sort, {
      ascending: params.direction === "asc",
      nullsFirst: false,
    })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("[mipnu] gagal memuat anggota", error.message);
    return { rows: [], total: 0, page: params.page, pageCount: 0 };
  }

  const total = count ?? 0;

  return {
    rows: data.map((row) => ({
      id: row.id,
      memberNumber: row.member_number,
      fullName: row.full_name,
      gender: row.gender,
      status: row.status,
      joinDate: row.join_date,
      email: options.includePrivate ? row.email : null,
      phone: options.includePrivate ? row.phone : null,
    })),
    total,
    page: params.page,
    pageCount: Math.max(1, Math.ceil(total / MEMBERS_PAGE_SIZE)),
  };
}

function escapeLikePattern(value: string) {
  return value.replace(/[%_,()\\]/g, (match) => `\\${match}`);
}
