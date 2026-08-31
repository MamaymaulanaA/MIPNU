import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Deret kegiatan organisasi per bulan.
 *
 * Sumbernya tiga tabel yang memang berarti "kegiatan": agenda, event, dan
 * rapat. Masing-masing hanya ikut dihitung bila pemanggil berhak melihatnya —
 * seorang anggota yang tidak boleh membuka daftar rapat tidak akan menemukan
 * jumlah rapat organisasinya lewat sebuah grafik.
 *
 * Yang diambil HANYA kolom tanggal. Judul, lokasi, dan peserta tidak
 * dibutuhkan untuk menghitung, jadi tidak ikut dikirim.
 *
 * Pengelompokan dilakukan di sini, bukan di SQL: rentangnya dua belas bulan
 * dan barisnya sedikit, sehingga satu view atau RPC baru hanya menambah
 * permukaan migrasi tanpa menghemat apa pun.
 */

export type ActivityPoint = {
  /** 'YYYY-MM' — kunci stabil untuk sumbu X. */
  month: string;
  /** Label pendek untuk sumbu, mis. "Sep '26". */
  label: string;
  total: number;
};

export type ActivitySeries = {
  points: ActivityPoint[];
  /** Jumlah seluruh kegiatan pada rentang. */
  total: number;
  /** Sumber yang benar-benar ikut dihitung — dipakai untuk keterangan. */
  sources: string[];
  /** Jumlah per sumber pada rentang yang sama dengan grafik. */
  bySource: { label: string; total: number }[];
  /** Keterangan rentang, mis. "Mar 2026 – Feb 2027". */
  range: string;
};

export type ActivitySources = {
  agenda: boolean;
  events: boolean;
  meetings: boolean;
};

const BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/**
 * Jendela dua belas bulan yang MEMANDANG KE DUA ARAH: enam bulan ke belakang
 * (termasuk bulan berjalan) dan enam bulan ke depan.
 *
 * Alasannya ada pada isi tabelnya. Agenda, event, dan rapat adalah kegiatan
 * TERJADWAL — tanggalnya sering berada di masa depan. Jendela yang hanya
 * melihat ke belakang membuat organisasi dengan agenda bulan depan melihat
 * garis nol, sementara kartu di atasnya menyebut "Agenda Mendatang 1". Dua
 * pernyataan itu benar, tetapi berdampingan keduanya membingungkan.
 */
const MUNDUR = 5;
const MAJU = 6;

function kerangka(): ActivityPoint[] {
  const sekarang = new Date();
  const titik: ActivityPoint[] = [];

  for (let i = -MUNDUR; i <= MAJU; i += 1) {
    const d = new Date(sekarang.getFullYear(), sekarang.getMonth() + i, 1);
    const bulan = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    titik.push({
      month: bulan,
      label: `${BULAN[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
      total: 0,
    });
  }

  return titik;
}

export async function getActivitySeries(
  organizationId: string,
  sources: ActivitySources,
): Promise<ActivitySeries | null> {
  const aktif = Object.entries(sources).filter(([, boleh]) => boleh);
  if (aktif.length === 0) return null;

  const supabase = await createClient();
  const titik = kerangka();
  const indeks = new Map(titik.map((t, i) => [t.month, i]));

  // Batas bawah dan atas mengikuti kerangka, sehingga baris di luar jendela
  // tidak ikut terambil dari database sama sekali.
  const sejak = new Date();
  sejak.setMonth(sejak.getMonth() - MUNDUR);
  sejak.setDate(1);
  sejak.setHours(0, 0, 0, 0);
  const sejakIso = sejak.toISOString();

  const sampai = new Date();
  sampai.setMonth(sampai.getMonth() + MAJU + 1);
  sampai.setDate(1);
  sampai.setHours(0, 0, 0, 0);
  const sampaiIso = sampai.toISOString();

  const dipakai: string[] = [];
  const perSumber: { label: string; total: number }[] = [];
  let total = 0;

  // Tabelnya disebut satu per satu, bukan lewat nama dinamis: tipe PostgREST
  // menolak nama tabel bertipe string, dan menyiasatinya dengan `as never`
  // hanya akan mematikan pemeriksaan yang justru berguna di sini.
  const ambil = async (
    kunci: keyof ActivitySources,
    label: string,
    query: PromiseLike<{
      data: { start_at: string }[] | null;
      error: { message: string } | null;
    }>,
  ) => {
    if (!sources[kunci]) return;

    const { data, error } = await query;

    if (error) {
      console.error(`[mipnu] gagal memuat deret ${kunci}`, error.message);
      return;
    }

    dipakai.push(label);

    let jumlah = 0;

    for (const baris of data ?? []) {
      const bulan = String(baris.start_at).slice(0, 7);
      const i = indeks.get(bulan);
      if (i === undefined) continue;

      titik[i]!.total += 1;
      jumlah += 1;
      total += 1;
    }

    // Jumlah per sumber dihitung dari baris yang sama, bukan lewat query
    // tambahan: rentangnya sudah sama dan barisnya sudah di tangan.
    perSumber.push({ label, total: jumlah });
  };

  await ambil(
    "agenda",
    "Agenda",
    supabase
      .from("agenda_items")
      .select("start_at")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .gte("start_at", sejakIso)
      .lt("start_at", sampaiIso)
      .limit(2000),
  );

  await ambil(
    "events",
    "Event",
    supabase
      .from("events")
      .select("start_at")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .gte("start_at", sejakIso)
      .lt("start_at", sampaiIso)
      .limit(2000),
  );

  await ambil(
    "meetings",
    "Rapat",
    supabase
      .from("meetings")
      .select("start_at")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .gte("start_at", sejakIso)
      .lt("start_at", sampaiIso)
      .limit(2000),
  );

  if (dipakai.length === 0) return null;

  return {
    points: titik,
    total,
    sources: dipakai,
    bySource: perSumber,
    range: `${titik[0]!.label} – ${titik[titik.length - 1]!.label}`,
  };
}

/* -------------------------------------------------- ringkasan pendamping */

export type InsightSummary = {
  documents: number | null;
  announcements: number | null;
};

/**
 * Dua angka pendamping di bawah grafik.
 *
 * Keduanya dihitung pada rentang yang sama dengan grafik supaya "6 dokumen"
 * berarti enam dokumen pada periode yang sedang dilihat — bukan enam sejak
 * organisasi berdiri. NULL berarti pemanggil tidak berhak, dan angkanya tidak
 * ditampilkan sama sekali.
 */
export async function getInsightSummary(
  organizationId: string,
  gates: { documents: boolean; announcements: boolean },
  months = 12,
): Promise<InsightSummary> {
  const supabase = await createClient();

  const sejak = new Date();
  sejak.setMonth(sejak.getMonth() - (months - 1));
  sejak.setDate(1);
  sejak.setHours(0, 0, 0, 0);
  const sejakIso = sejak.toISOString();

  const [documents, announcements] = await Promise.all([
    gates.documents
      ? supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .is("deleted_at", null)
          .gte("created_at", sejakIso)
      : Promise.resolve({ count: null }),
    gates.announcements
      ? supabase
          .from("announcements")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .is("deleted_at", null)
          .gte("created_at", sejakIso)
      : Promise.resolve({ count: null }),
  ]);

  return {
    documents: documents.count ?? null,
    announcements: announcements.count ?? null,
  };
}
