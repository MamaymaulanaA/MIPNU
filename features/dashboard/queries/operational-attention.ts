import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Daftar pekerjaan, bukan ringkasan keadaan.
 *
 * Sebuah baris hanya muncul bila pemanggil BERWENANG menanganinya, bukan
 * sekadar boleh melihatnya. Baris bernilai nol tidak ditampilkan, dan panelnya
 * tidak dirender bila kosong. Karena itu panel ini efektif hanya muncul untuk
 * operator — karena permission penanganannya, bukan karena rolenya diperiksa.
 */

export type AttentionKey =
  | "anggota-tanpa-akun"
  | "akun-belum-ditautkan"
  | "anggota-nonaktif"
  | "presensi-terbuka"
  | "pengumuman-draf"
  | "event-draf";

export type AttentionItem = {
  key: AttentionKey;
  label: string;
  value: number;
  context: string;
};

export type AttentionGates = {
  linkAccounts: boolean;
  memberStatus: boolean;
  attendance: boolean;
  announcements: boolean;
  events: boolean;
};

export async function getOperationalAttention(
  organizationId: string,
  gates: AttentionGates,
  memberTotal: number | null,
): Promise<AttentionItem[]> {
  const perlu =
    gates.linkAccounts ||
    gates.memberStatus ||
    gates.attendance ||
    gates.announcements ||
    gates.events;

  if (!perlu) return [];

  const supabase = await createClient();

  const [tertaut, akunLepas, nonAktif, sesiTerbuka, pengumumanDraf, eventDraf] =
    await Promise.all([
      gates.linkAccounts && memberTotal !== null
        ? supabase
            .from("organization_memberships")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .not("member_id", "is", null)
        : null,
      gates.linkAccounts
        ? supabase
            .from("organization_memberships")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .is("member_id", null)
        : null,
      gates.memberStatus
        ? supabase
            .from("members")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .is("deleted_at", null)
            .neq("status", "ACTIVE")
        : null,
      gates.attendance
        ? supabase
            .from("attendance_sessions")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .eq("status", "OPEN")
        : null,
      gates.announcements
        ? supabase
            .from("announcements")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .is("deleted_at", null)
            .eq("status", "DRAFT")
        : null,
      gates.events
        ? supabase
            .from("events")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .is("deleted_at", null)
            .eq("status", "DRAFT")
        : null,
    ]);

  const items: AttentionItem[] = [];

  const tambah = (
    key: AttentionKey,
    label: string,
    context: string,
    value: number | null | undefined,
  ) => {
    if (!value || value <= 0) return;
    items.push({ key, label, value, context });
  };

  if (tertaut && memberTotal !== null) {
    tambah(
      "anggota-tanpa-akun",
      "Anggota tanpa akun",
      "Belum dapat masuk aplikasi",
      memberTotal - (tertaut.count ?? 0),
    );
  }

  tambah(
    "akun-belum-ditautkan",
    "Akun belum ditautkan",
    "Belum terhubung ke data anggota",
    akunLepas?.count,
  );

  tambah(
    "anggota-nonaktif",
    "Anggota nonaktif",
    "Status perlu ditinjau",
    nonAktif?.count,
  );

  tambah(
    "presensi-terbuka",
    "Sesi presensi terbuka",
    "Belum ditutup",
    sesiTerbuka?.count,
  );

  tambah(
    "pengumuman-draf",
    "Pengumuman draf",
    "Belum diterbitkan",
    pengumumanDraf?.count,
  );

  tambah("event-draf", "Event draf", "Belum diterbitkan", eventDraf?.count);

  return items;
}
