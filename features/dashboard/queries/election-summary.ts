import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ElectionParticipation = {
  eligible: number;
  voted: number;
  remaining: number;
  percent: number;
};

export type ElectionPreview = {
  id: string;
  name: string;
  status: string;
  startAt: string;
  endAt: string;
};

export type ElectionSummary = {
  total: number;
  byStatus: { status: string; total: number }[];
  recent: ElectionPreview[];
  focus: {
    id: string;
    name: string;
    status: string;
    startAt: string;
    endAt: string;
    participation: ElectionParticipation | null;
  } | null;
};

const PUNYA_DPT = ["SCHEDULED", "OPEN", "CLOSED", "PUBLISHED", "ARCHIVED"];

const PRIORITAS: Record<string, number> = {
  OPEN: 0,
  SCHEDULED: 1,
  CLOSED: 2,
  REGISTRATION: 3,
  PUBLISHED: 4,
  DRAFT: 5,
  ARCHIVED: 6,
  CANCELLED: 7,
};

export async function getElectionSummary(
  organizationId: string,
): Promise<ElectionSummary | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("elections")
    .select("id, name, status, start_at, end_at")
    .eq("organization_id", organizationId)
    .order("start_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[mipnu] gagal memuat ringkasan pemilihan", error.message);
    return null;
  }

  const rows = data ?? [];
  if (rows.length === 0) return null;

  const hitung = new Map<string, number>();
  for (const row of rows) {
    hitung.set(row.status, (hitung.get(row.status) ?? 0) + 1);
  }

  const byStatus = [...hitung.entries()]
    .map(([status, total]) => ({ status, total }))
    .sort((a, b) => (PRIORITAS[a.status] ?? 99) - (PRIORITAS[b.status] ?? 99));

  const terurut = [...rows].sort(
    (a, b) => (PRIORITAS[a.status] ?? 99) - (PRIORITAS[b.status] ?? 99),
  );
  const terpilih = terurut[0]!;

  const recent: ElectionPreview[] = terurut.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    startAt: row.start_at,
    endAt: row.end_at,
  }));

  let participation: ElectionParticipation | null = null;

  if (PUNYA_DPT.includes(terpilih.status)) {
    const { data: hasil } = await supabase.rpc("mipnu_election_participation", {
      p_election_id: terpilih.id,
    });

    const payload = hasil as unknown as {
      ok?: boolean;
      eligible_count?: number;
      voted_count?: number;
      remaining_count?: number;
      participation_percent?: number;
    } | null;

    if (payload?.ok) {
      participation = {
        eligible: payload.eligible_count ?? 0,
        voted: payload.voted_count ?? 0,
        remaining: payload.remaining_count ?? 0,
        percent: Math.round(payload.participation_percent ?? 0),
      };
    }
  }

  return {
    total: rows.length,
    byStatus,
    recent,
    focus: {
      id: terpilih.id,
      name: terpilih.name,
      status: terpilih.status,
      startAt: terpilih.start_at,
      endAt: terpilih.end_at,
      participation,
    },
  };
}
