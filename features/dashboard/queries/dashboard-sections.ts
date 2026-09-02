import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ActivityDomain =
  "kegiatan" | "administrasi" | "keanggotaan" | "pemilihan" | "lainnya";

export type ActivityItem = {
  id: string;
  action: string;
  createdAt: string;
  actorName: string | null;
  domain: ActivityDomain;
};

const RANAH: Record<string, ActivityDomain> = {
  agenda: "kegiatan",
  event: "kegiatan",
  meeting: "kegiatan",
  programs: "kegiatan",
  document: "administrasi",
  announcement: "administrasi",
  incoming_letter: "administrasi",
  outgoing_letter: "administrasi",
  member: "keanggotaan",
  cadreship: "keanggotaan",
  elections: "pemilihan",
};

function ranah(action: string): ActivityDomain {
  return RANAH[action.split(".")[0] ?? ""] ?? "lainnya";
}

const DIKECUALIKAN = ["elections.vote_cast"];

const LABEL: Record<string, string> = {
  "agenda.created": "Agenda baru ditambahkan",
  "agenda.updated": "Agenda diperbarui",
  "event.created": "Event baru dibuat",
  "event.updated": "Event diperbarui",
  "meeting.created": "Rapat dijadwalkan",
  "programs.created": "Program kerja baru",
  "programs.updated": "Program kerja diperbarui",
  "document.uploaded": "Dokumen baru diunggah",
  "announcement.published": "Pengumuman dipublikasikan",
  "announcement.created": "Pengumuman disusun",
  "incoming_letter.created": "Surat masuk dicatat",
  "outgoing_letter.created": "Surat keluar disusun",
  "member.created": "Anggota baru terdaftar",
  "cadreship.created": "Catatan kaderisasi ditambahkan",
  "elections.created": "Pemilihan dibuat",
  "elections.opened": "Pemungutan suara dibuka",
  "elections.closed": "Pemungutan suara ditutup",
  "elections.result_published": "Hasil pemilihan dipublikasikan",
};

export async function getRecentActivity(
  organizationId: string,
  limit = 6,
): Promise<ActivityItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, created_at, profiles ( display_name )")
    .eq("organization_id", organizationId)
    .in("action", Object.keys(LABEL))
    .not("action", "in", `(${DIKECUALIKAN.join(",")})`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[mipnu] gagal memuat aktivitas terbaru", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as {
    id: string;
    action: string;
    created_at: string;
    profiles: { display_name: string } | null;
  }[];

  return rows.map((row) => ({
    id: row.id,
    action: LABEL[row.action] ?? row.action,
    createdAt: row.created_at,
    actorName: row.profiles?.display_name ?? null,
    domain: ranah(row.action),
  }));
}
