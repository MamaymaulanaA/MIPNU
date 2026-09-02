import type { Metadata } from "next";

import { ForbiddenState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/data-table/pagination";
import { TableToolbar } from "@/components/data-table/toolbar";
import { bacaParamDaftar, polaCari } from "@/lib/list-params";
import {
  ProgramCreateDialog,
  ProgramManager,
  type ProgramRow,
} from "@/features/programs/components/program-manager";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Program Kerja",
};

const UKURAN_HALAMAN = 20;

const STATUS_PROGRAM = [
  { value: "DRAFT", label: "Draf" },
  { value: "PLANNED", label: "Direncanakan" },
  { value: "ONGOING", label: "Berjalan" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

export default async function WorkProgramsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.programs.view)) {
    return <ForbiddenState />;
  }

  const daftar = bacaParamDaftar(await searchParams, {
    ukuranHalaman: UKURAN_HALAMAN,
    kunciSaring: ["periode", "status"],
  });

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
      { count: "exact" },
    )
    .eq("organization_id", context.organizationId)
    .is("deleted_at", null);

  if (daftar.saring.periode) {
    query = query.eq("organization_period_id", daftar.saring.periode);
  }
  if (daftar.saring.status) {
    query = query.eq("status", daftar.saring.status);
  }
  if (daftar.cari) {
    query = query.ilike("name", polaCari(daftar.cari));
  }

  const [programsResult, periodsResult, positionsResult, membersResult] =
    await Promise.all([
      query
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(daftar.dari, daftar.sampai),

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

  const opsiPeriode = periods.map((period) => ({
    id: period.id,
    label: period.status === "ACTIVE" ? `${period.name} (aktif)` : period.name,
  }));
  const opsiJabatan = (
    (positionsResult.data as { id: string; name: string }[] | null) ?? []
  ).map((position) => ({ id: position.id, label: position.name }));
  const opsiAnggota = (
    (membersResult.data as { id: string; full_name: string }[] | null) ?? []
  ).map((member) => ({ id: member.id, label: member.full_name }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Program Kerja"
        description="Rencana kerja satu periode kepengurusan beserta capaiannya."
        actions={
          can(context, PERMISSIONS.programs.create) ? (
            <ProgramCreateDialog
              organizationId={context.organizationId}
              periodOptions={opsiPeriode}
              positionOptions={opsiJabatan}
              memberOptions={opsiAnggota}
            />
          ) : null
        }
      />

      <Card>
        <TableToolbar
          searchValue={daftar.cari}
          searchPlaceholder="Cari program kerja…"
          searchLabel="Cari program kerja"
          filters={[
            {
              key: "periode",
              label: "Saring menurut periode",
              value: daftar.saring.periode,
              allLabel: "Semua periode",
              options: periods.map((period) => ({
                value: period.id,
                label: period.name,
              })),
            },
            {
              key: "status",
              label: "Saring menurut status",
              value: daftar.saring.status,
              allLabel: "Semua status",
              options: STATUS_PROGRAM,
            },
          ]}
        />

        <ProgramManager
          organizationId={context.organizationId}
          programs={programs}
          periodOptions={opsiPeriode}
          positionOptions={opsiJabatan}
          memberOptions={opsiAnggota}
          permissions={{
            canCreate: can(context, PERMISSIONS.programs.create),
            canEdit: can(context, PERMISSIONS.programs.edit),
            canManage: can(context, PERMISSIONS.programs.manage),
            canUpdateProgress: can(
              context,
              PERMISSIONS.programs.updateProgress,
            ),
            canDelete: can(context, PERMISSIONS.programs.delete),
          }}
        />

        <Pagination
          page={daftar.halaman}
          pageCount={Math.max(
            1,
            Math.ceil((programsResult.count ?? 0) / UKURAN_HALAMAN),
          )}
          total={programsResult.count ?? 0}
          pageSize={UKURAN_HALAMAN}
        />
      </Card>
    </div>
  );
}
