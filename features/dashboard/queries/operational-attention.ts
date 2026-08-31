import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Hal yang menunggu tindakan operator.
 *
 * Aturannya dua, dan keduanya menentukan bentuk berkas ini.
 *
 * PERTAMA: sebuah baris hanya muncul bila pemanggil memang BERWENANG
 * menanganinya, bukan sekadar boleh melihatnya. Daftar ini bukan ringkasan
 * keadaan — itu tugas kartu metrik — melainkan daftar pekerjaan. Menampilkan
 * "dua anggota belum punya akun" kepada orang yang tidak dapat menautkan akun
 * hanya memindahkan kegelisahan tanpa memindahkan kemampuan.
 *
 * KEDUA: baris bernilai nol TIDAK ditampilkan, dan bila tidak ada satu pun
 * baris tersisa, seluruh panelnya tidak dirender. Daftar tindak lanjut yang
 * berisi tiga baris "0" adalah kartu kosong dengan hiasan angka.
 *
 * Karena itu panel ini muncul pada dashboard operator dan tidak pada dashboard
 * peran lain — bukan karena rolenya diperiksa, melainkan karena permission
 * penanganannya memang hanya dimiliki operator.
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
  /** users.assign_organization — menautkan akun ke anggota. */
  linkAccounts: boolean;
  /** members.manage_status — mengubah status keanggotaan. */
  memberStatus: boolean;
  /** attendance.manage — menutup sesi presensi. */
  attendance: boolean;
  /** announcements.publish — menerbitkan pengumuman. */
  announcements: boolean;
  /** events.publish — menerbitkan event. */
  events: boolean;
};

export async function getOperationalAttention(
  organizationId: string,
  gates: AttentionGates,
  /** Jumlah anggota dari agregat; NULL bila pemanggil tidak berhak melihatnya. */
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
      // Anggota yang sudah punya akun dihitung dari sisi keanggotaan: kunci
      // gabungan (id, organization_id) menjamin `member_id` selalu menunjuk
      // anggota pada organisasi yang sama, jadi selisihnya terhadap jumlah
      // anggota adalah anggota yang belum punya akun.
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
