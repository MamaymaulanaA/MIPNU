import "server-only";

import { createClient } from "@/lib/supabase/server";

export type OperationalRow = {
  key: "jabatan" | "periode" | "akun";
  label: string;
  value: number;
  context: string;
};

export type OperationalGates = {
  positions: boolean;
  periods: boolean;
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
