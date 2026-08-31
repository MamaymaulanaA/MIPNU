import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Angka struktur organisasi yang dipelihara operator.
 *
 * Bukan ringkasan keadaan seperti jumlah anggota, melainkan jumlah HAL YANG
 * DIKONFIGURASI: jabatan, periode kepengurusan, dan akun yang tertaut ke
 * organisasi. Tiga angka itu jarang berubah, dan justru karena itu berguna —
 * operator adalah orang yang mengubahnya.
 *
 * Gerbangnya memakai permission PENYUNTINGAN, bukan permission melihat.
 * Jabatan dan periode boleh dilihat hampir semua pengurus; yang memeliharanya
 * hanya operator. Karena itu blok ini muncul di dashboard operator dan tidak
 * di dashboard peran lain, tanpa satu pun pemeriksaan role.
 */

export type OperationalRow = {
  key: "jabatan" | "periode" | "akun";
  label: string;
  value: number;
  context: string;
};

export type OperationalGates = {
  /** positions.edit */
  positions: boolean;
  /** periods.edit */
  periods: boolean;
  /** users.view */
  accounts: boolean;
};

export async function getOperationalSummary(
  organizationId: string,
  gates: OperationalGates,
): Promise<OperationalRow[]> {
  if (!gates.positions && !gates.periods && !gates.accounts) return [];

  const supabase = await createClient();

  const [positions, periods, accounts] = await Promise.all([
    gates.positions
      ? supabase
          .from("positions")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
      : null,
    gates.periods
      ? supabase
          .from("organization_periods")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
      : null,
    gates.accounts
      ? supabase
          .from("organization_memberships")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("status", "ACTIVE")
      : null,
  ]);

  const rows: OperationalRow[] = [];

  if (positions && !positions.error) {
    rows.push({
      key: "jabatan",
      label: "Jabatan",
      value: positions.count ?? 0,
      context: "Terdaftar",
    });
  }

  if (periods && !periods.error) {
    rows.push({
      key: "periode",
      label: "Periode",
      value: periods.count ?? 0,
      context: "Tercatat",
    });
  }

  if (accounts && !accounts.error) {
    rows.push({
      key: "akun",
      label: "Akun Terhubung",
      value: accounts.count ?? 0,
      context: "Aktif pada organisasi",
    });
  }

  return rows;
}
