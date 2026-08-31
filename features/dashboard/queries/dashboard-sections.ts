import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Dua bagian dashboard yang tidak dapat diambil dari agregat: pratinjau
 * anggota dan aktivitas terbaru.
 *
 * Keduanya BARIS, bukan angka — dan karena itu keduanya tunduk pada RLS
 * tabelnya masing-masing. Pemanggil tetap wajib memeriksa permission lebih
 * dulu supaya query-nya tidak dijalankan sama sekali bagi yang tidak berhak:
 * baris yang tidak boleh dilihat tidak boleh sampai ke payload RSC, bukan
 * sekadar disembunyikan CSS.
 */

/* ---------------------------------------------------------- aktivitas */

/**
 * Ranah peristiwa, diturunkan dari awalan kode aksi.
 *
 * Dipakai HANYA untuk mewarnai ikon pada dashboard administrator platform.
 * Nilainya tidak menambah informasi apa pun yang tidak sudah ada pada
 * labelnya, jadi dashboard lain boleh mengabaikannya tanpa kehilangan apa pun.
 */
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

/**
 * Peristiwa yang TIDAK PERNAH muncul di dashboard, apa pun hak pemanggilnya.
 *
 * `elections.vote_cast` mencatat bahwa seseorang memberikan suara — tanpa
 * kandidat, jadi kerahasiaan pilihannya utuh. Tetapi menampilkan "X memberikan
 * suara" pada aliran aktivitas yang berjalan sepanjang hari pemungutan suara
 * mengubah fakta yang tenang di layar DPT menjadi siaran langsung siapa yang
 * sudah dan belum memilih. Itu tekanan sosial yang tidak diminta siapa pun
 * (EVOTING §127, §198).
 */
const DIKECUALIKAN = ["elections.vote_cast"];

/**
 * Label manusiawi untuk peristiwa audit.
 *
 * Hanya peristiwa yang ada di sini yang ditampilkan. Peristiwa lain — termasuk
 * yang belum sempat diberi label — sengaja dilewati: aliran aktivitas bukan
 * tempat menumpahkan seluruh jejak audit, dan kode mentah seperti
 * `finance.proof_viewed` di dashboard hanya membingungkan sekaligus
 * membocorkan lebih banyak daripada yang dibutuhkan.
 */
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

/**
 * Aktivitas terbaru organisasi.
 *
 * Sumbernya `audit_logs`, yang RLS-nya sendiri sudah membatasi baris mana
 * terbaca oleh siapa. Pemanggil tetap memeriksa `audit.view` lebih dulu agar
 * query-nya tidak berjalan sama sekali bagi yang tidak berhak.
 *
 * Metadata TIDAK ikut dibaca. Isinya beragam antar-modul dan sebagian memuat
 * hal yang tidak pantas berada di dashboard; yang dibutuhkan di sini hanya
 * peristiwa, waktu, dan pelakunya.
 */
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
