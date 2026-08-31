import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { ForbiddenState } from "@/components/feedback/states";
import { PeriodManager } from "@/features/periods/components/period-manager";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Periode Kepengurusan",
};

export default async function PeriodsPage() {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.periods.view)) {
    return <ForbiddenState />;
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from("organization_periods")
    .select("id, name, start_date, end_date, status")
    .eq("organization_id", context.organizationId)
    .order("start_date", { ascending: false });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Periode Kepengurusan"
        description="Periode lama tetap tersimpan ketika periode baru dibuat."
      />

      <PeriodManager
        organizationId={context.organizationId}
        periods={(data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          startDate: row.start_date,
          endDate: row.end_date,
          status: row.status,
        }))}
        permissions={{
          canCreate: can(context, PERMISSIONS.periods.create),
          canEdit: can(context, PERMISSIONS.periods.edit),
          canActivate: can(context, PERMISSIONS.periods.activate),
          canClose: can(context, PERMISSIONS.periods.close),
          canArchive: can(context, PERMISSIONS.periods.archive),
        }}
      />
    </div>
  );
}
