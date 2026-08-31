import type { Metadata } from "next";

import { ForbiddenState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import {
  ProgramManager,
  type ProgramRow,
} from "@/features/programs/components/program-manager";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Program Kerja",
};

export default async function WorkProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; status?: string; cari?: string }>;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.programs.view)) {
    return <ForbiddenState />;
  }

  const filters = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("work_programs")
    .select(
      `
      id, organization_period_id, name, description, responsible_position_id,
      responsible_member_id, start_date, end_date, target, budget_amount,
      progress, status,
      organization_periods!work_programs_period_fk ( name ),
      positions!work_programs_position_fk ( name ),
      members!work_programs_member_fk ( full_name )
    `,
    )
    .eq("organization_id", context.organizationId)
    .is("deleted_at", null);

  // Penyaringan terjadi di database. Mengirim seluruh baris lalu menyaring di
  // browser akan tetap membocorkan yang tersaring itu.
  if (filters.periode) {
    query = query.eq("organization_period_id", filters.periode);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.cari) {
    const escaped = filters.cari.replace(/[%_,()\\]/g, (m) => `\\${m}`);
    query = query.ilike("name", `%${escaped}%`);
  }

  const [programsResult, periodsResult, positionsResult, membersResult] =
    await Promise.all([
      query.order("created_at", { ascending: false }),

      supabase
        .from("organization_periods")
        .select("id, name, status")
        .eq("organization_id", context.organizationId)
        .order("start_date", { ascending: false }),

      supabase
        .from("positions")
        .select("id, name")
        .eq("organization_id", context.organizationId)
        .order("name"),

      supabase
        .from("members")
        .select("id, full_name")
        .eq("organization_id", context.organizationId)
        .is("deleted_at", null)
        .order("full_name"),
    ]);

  type Row = {
    id: string;
    organization_period_id: string;
    name: string;
    description: string | null;
    responsible_position_id: string | null;
    responsible_member_id: string | null;
    start_date: string | null;
    end_date: string | null;
    target: string | null;
    budget_amount: number | null;
    progress: number;
    status: string;
    organization_periods: { name: string } | null;
    positions: { name: string } | null;
    members: { full_name: string } | null;
  };

  const programs: ProgramRow[] = (
    (programsResult.data as unknown as Row[] | null) ?? []
  ).map((row) => ({
    id: row.id,
    periodId: row.organization_period_id,
    periodName: row.organization_periods?.name ?? "—",
    name: row.name,
    description: row.description,
    positionId: row.responsible_position_id,
    positionName: row.positions?.name ?? null,
    memberId: row.responsible_member_id,
    memberName: row.members?.full_name ?? null,
    startDate: row.start_date,
    endDate: row.end_date,
    target: row.target,
    budgetAmount: row.budget_amount,
    progress: row.progress,
    status: row.status,
  }));

  const periods =
    (periodsResult.data as
      { id: string; name: string; status: string }[] | null) ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Program Kerja"
        description="Rencana kerja satu periode kepengurusan beserta capaiannya."
      />

      <form className="flex flex-wrap items-end gap-2.5">
        <input
          type="search"
          name="cari"
          placeholder="Cari nama program"
          defaultValue={filters.cari ?? ""}
          aria-label="Cari program kerja"
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-64"
        />

        <select
          name="periode"
          defaultValue={filters.periode ?? ""}
          aria-label="Filter periode"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Semua periode</option>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name}
            </option>
          ))}
        </select>

        <select
          name="status"
          defaultValue={filters.status ?? ""}
          aria-label="Filter status"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Semua status</option>
          <option value="DRAFT">Draf</option>
          <option value="PLANNED">Direncanakan</option>
          <option value="ONGOING">Berjalan</option>
          <option value="COMPLETED">Selesai</option>
          <option value="CANCELLED">Dibatalkan</option>
        </select>

        <button
          type="submit"
          className="h-10 rounded-md border border-border px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Terapkan
        </button>
      </form>

      <ProgramManager
        organizationId={context.organizationId}
        programs={programs}
        periodOptions={periods.map((period) => ({
          id: period.id,
          label:
            period.status === "ACTIVE" ? `${period.name} (aktif)` : period.name,
        }))}
        positionOptions={(
          (positionsResult.data as { id: string; name: string }[] | null) ?? []
        ).map((position) => ({ id: position.id, label: position.name }))}
        memberOptions={(
          (membersResult.data as { id: string; full_name: string }[] | null) ??
          []
        ).map((member) => ({ id: member.id, label: member.full_name }))}
        permissions={{
          canCreate: can(context, PERMISSIONS.programs.create),
          canEdit: can(context, PERMISSIONS.programs.edit),
          canManage: can(context, PERMISSIONS.programs.manage),
          canUpdateProgress: can(context, PERMISSIONS.programs.updateProgress),
          canDelete: can(context, PERMISSIONS.programs.delete),
        }}
      />
    </div>
  );
}
