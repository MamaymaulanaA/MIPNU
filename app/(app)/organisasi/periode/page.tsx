import type { Metadata } from "next";

import { ForbiddenState } from "@/components/feedback/states";
import { PeriodManager } from "@/features/periods/components/period-manager";
import { PERIOD_STATUSES } from "@/features/periods/schemas/period.schema";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { bacaParamDaftar, polaCari } from "@/lib/list-params";
import { periodStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Periode Kepengurusan",
};

const UKURAN_HALAMAN = 20;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PeriodsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.periods.view)) {
    return <ForbiddenState />;
  }

  const daftar = bacaParamDaftar(await searchParams, {
    ukuranHalaman: UKURAN_HALAMAN,
    kunciSaring: ["status"],
  });

  const supabase = await createClient();

  let query = supabase
    .from("organization_periods")
    .select("id, name, start_date, end_date, status", { count: "exact" })
    .eq("organization_id", context.organizationId);

  if (daftar.saring.status) query = query.eq("status", daftar.saring.status);
  if (daftar.cari) query = query.ilike("name", polaCari(daftar.cari));

  const { data, count } = await query
    .order("start_date", { ascending: false })
    .order("id", { ascending: true })
    .range(daftar.dari, daftar.sampai);

  return (
    <PeriodManager
      organizationId={context.organizationId}
      periods={(data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
      }))}
      daftar={{
        cari: daftar.cari,
        status: daftar.saring.status,
        statusOptions: PERIOD_STATUSES.map((status) => ({
          value: status,
          label: periodStatus(status).label,
        })),
        halaman: daftar.halaman,
        total: count ?? 0,
        ukuranHalaman: UKURAN_HALAMAN,
      }}
      permissions={{
        canCreate: can(context, PERMISSIONS.periods.create),
        canEdit: can(context, PERMISSIONS.periods.edit),
        canActivate: can(context, PERMISSIONS.periods.activate),
        canClose: can(context, PERMISSIONS.periods.close),
        canArchive: can(context, PERMISSIONS.periods.archive),
      }}
    />
  );
}
