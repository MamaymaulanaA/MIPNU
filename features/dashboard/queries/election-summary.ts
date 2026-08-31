import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Ringkasan pemilihan untuk dashboard organisasi.
 *
 * BATAS YANG TIDAK BOLEH DILANGGAR. Berkas ini tidak pernah membaca perolehan
 * kandidat, dalam status apa pun. Yang diambilnya hanya dua hal: jumlah
 * pemilihan menurut statusnya, dan angka partisipasi dari
 * `mipnu_election_participation()` — satu-satunya fungsi yang memang dirancang
 * aman ditampilkan selagi pemungutan suara berlangsung (EVOTING §82). Fungsi
 * itu mengembalikan DPT, sudah memilih, sisa, dan persentase; tidak ada nama,
 * tidak ada pilihan, tidak ada kandidat.
 *
 * `mipnu_election_result()` sengaja TIDAK dipanggil di sini. Hasil resmi punya
 * halamannya sendiri dengan gerbangnya sendiri; sebuah dashboard bukan tempat
 * perolehan suara muncul sambil lalu.
 *
 * Barisnya sendiri tunduk pada RLS `elections`. Pemanggil tetap memeriksa
 * `elections.view` lebih dulu supaya query-nya tidak berjalan sama sekali bagi
 * yang tidak berhak.
 */

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
  /** Hanya status yang benar-benar ada barisnya. */
  byStatus: { status: string; total: number }[];
  /**
   * Beberapa pemilihan teratas menurut urutan perhatian, bukan hanya satu.
   *
   * Panelnya sebelumnya hanya menampilkan `focus`, sehingga organisasi dengan
   * empat pemilihan tetap terbaca seolah hanya punya satu — dan panelnya
   * berdiri hampir kosong di sebelah panel yang berisi tiga baris.
   *
   * Isinya persis kolom yang sudah diambil query ini: nama, status, dan
   * jadwal. Tidak ada tambahan pembacaan, dan tidak ada perolehan kandidat.
   */
  recent: ElectionPreview[];
  /** Pemilihan yang paling perlu diperhatikan, bila ada. */
  focus: {
    id: string;
    name: string;
    status: string;
    startAt: string;
    endAt: string;
    /** NULL bila statusnya belum punya DPT yang berarti. */
    participation: ElectionParticipation | null;
  } | null;
};

/**
 * Status yang partisipasinya berarti untuk ditampilkan.
 *
 * DRAFT dan REGISTRATION belum tentu punya DPT; menampilkan "0 dari 0 pemilih"
 * di sana hanya menyatakan bahwa daftarnya belum disusun, dan itu sudah
 * terbaca dari statusnya sendiri.
 */
const PUNYA_DPT = ["SCHEDULED", "OPEN", "CLOSED", "PUBLISHED", "ARCHIVED"];

/** Urutan perhatian: yang sedang berlangsung selalu lebih dulu. */
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

  // Barisnya sudah terurut tanggal menurun; stabilkan menurut prioritas status
  // supaya pemilihan yang sedang berlangsung selalu menang atas yang selesai.
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
