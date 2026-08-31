import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Jadwal terdekat organisasi.
 *
 * Menggabungkan agenda, event, dan rapat menjadi SATU daftar berurut waktu.
 * Alasannya bukan penghematan tempat: seorang pengurus tidak bertanya "apa
 * agenda saya" lalu "apa event saya" lalu "apa rapat saya" — ia bertanya apa
 * yang akan terjadi lebih dulu. Tiga kartu terpisah memaksanya menggabungkan
 * tiga urutan waktu di kepalanya sendiri.
 *
 * Setiap sumber hanya ikut bila pemanggil memang berhak melihatnya. Yang tidak
 * berhak tidak menyumbang satu baris pun — dan karena penggabungan terjadi
 * setelah penyaringan, tidak ada jadwal yang bocor lewat sebuah daftar
 * gabungan.
 *
 * Kolomnya berbeda antar-tabel: `events` menyimpan judul pada `name`,
 * sementara `agenda_items` dan `meetings` pada `title`. Perbedaan itu
 * diselesaikan di sini, bukan di komponen.
 */

export type ScheduleKind = "agenda" | "event" | "meeting";

export type ScheduleItem = {
  id: string;
  kind: ScheduleKind;
  title: string;
  startAt: string;
  location: string | null;
};

export type ScheduleSources = {
  agenda: boolean;
  events: boolean;
  meetings: boolean;
};

export async function getUpcomingSchedule(
  organizationId: string,
  sources: ScheduleSources,
  limit = 5,
): Promise<ScheduleItem[] | null> {
  if (!sources.agenda && !sources.events && !sources.meetings) return null;

  const supabase = await createClient();
  const sejak = new Date().toISOString();

  // Tabelnya disebut satu per satu, bukan lewat nama dinamis: tipe PostgREST
  // menolak nama tabel bertipe string, dan menyiasatinya dengan `as never`
  // hanya akan mematikan pemeriksaan yang justru berguna di sini.
  const [agenda, events, meetings] = await Promise.all([
    sources.agenda
      ? supabase
          .from("agenda_items")
          .select("id, title, start_at, location")
          .eq("organization_id", organizationId)
          .is("deleted_at", null)
          .gte("start_at", sejak)
          .order("start_at", { ascending: true })
          .limit(limit)
      : null,
    sources.events
      ? supabase
          .from("events")
          .select("id, name, start_at, location")
          .eq("organization_id", organizationId)
          .is("deleted_at", null)
          .gte("start_at", sejak)
          .order("start_at", { ascending: true })
          .limit(limit)
      : null,
    sources.meetings
      ? supabase
          .from("meetings")
          .select("id, title, start_at, location")
          .eq("organization_id", organizationId)
          .is("deleted_at", null)
          .gte("start_at", sejak)
          .order("start_at", { ascending: true })
          .limit(limit)
      : null,
  ]);

  const items: ScheduleItem[] = [];

  const kumpulkan = (
    kind: ScheduleKind,
    hasil: { data: unknown; error: { message: string } | null } | null,
  ) => {
    if (!hasil) return;

    if (hasil.error) {
      console.error(`[mipnu] gagal memuat jadwal ${kind}`, hasil.error.message);
      return;
    }

    const rows = (hasil.data ?? []) as {
      id: string;
      title?: string;
      name?: string;
      start_at: string;
      location: string | null;
    }[];

    for (const row of rows) {
      items.push({
        id: `${kind}-${row.id}`,
        kind,
        title: row.title ?? row.name ?? "",
        startAt: row.start_at,
        location: row.location,
      });
    }
  };

  kumpulkan("agenda", agenda);
  kumpulkan("event", events);
  kumpulkan("meeting", meetings);

  items.sort((a, b) => a.startAt.localeCompare(b.startAt));

  return items.slice(0, limit);
}
