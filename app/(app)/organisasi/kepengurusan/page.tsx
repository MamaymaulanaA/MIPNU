import type { Metadata } from "next";

import { ForbiddenState } from "@/components/feedback/states";
import { ExportButton } from "@/features/exports/components/export-button";
import { exportManagement } from "@/features/exports/actions/export-csv";
import { ManagementManager } from "@/features/management/components/management-manager";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { bacaParamDaftar, polaCari } from "@/lib/list-params";
import { formatPeriodRange, orDash } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Kepengurusan",
};

const UKURAN_HALAMAN = 20;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ManagementPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.management.view)) {
    return <ForbiddenState />;
  }

  const daftar = bacaParamDaftar(await searchParams, {
    ukuranHalaman: UKURAN_HALAMAN,
    kunciSaring: ["periode", "jabatan"],
  });

  const supabase = await createClient();
  const canAssign = can(context, PERMISSIONS.management.assign);

  const [assignmentsResult, periodsResult, membersResult, positionsResult] =
    await Promise.all([
      supabase
        .from("management_assignments")
        .select(
          `
          id, status, start_date, end_date,
          member_id, position_id, organization_period_id,
          members!inner ( full_name, member_number ),
          positions!inner ( name, sort_order ),
          organization_periods!inner ( name, start_date, end_date )
        `,
          { count: "exact" },
        )
        .eq("organization_id", context.organizationId)
        .match(
          Object.fromEntries(
            [
              daftar.saring.periode
                ? ["organization_period_id", daftar.saring.periode]
                : null,
              daftar.saring.jabatan
                ? ["position_id", daftar.saring.jabatan]
                : null,
            ].filter(Boolean) as [string, string][],
          ),
        )
        // `members!inner` yang membuat penyaringan atas nama anggota dapat
        // dilakukan di database, bukan setelah barisnya sampai ke aplikasi.
        .ilike("members.full_name", daftar.cari ? polaCari(daftar.cari) : "%")
        .range(daftar.dari, daftar.sampai),

      // Pilihan form hanya dimuat bila pengguna memang boleh menugaskan.
      canAssign
        ? supabase
            .from("organization_periods")
            .select("id, name, start_date, end_date")
            .eq("organization_id", context.organizationId)
            .in("status", ["DRAFT", "ACTIVE"])
            .order("start_date", { ascending: false })
        : Promise.resolve({ data: null }),

      canAssign
        ? supabase
            .from("members")
            .select("id, full_name, member_number")
            .eq("organization_id", context.organizationId)
            .eq("status", "ACTIVE")
            .is("deleted_at", null)
            .order("full_name")
        : Promise.resolve({ data: null }),

      canAssign
        ? supabase
            .from("positions")
            .select("id, name")
            .eq("organization_id", context.organizationId)
            .eq("is_active", true)
            .order("sort_order")
        : Promise.resolve({ data: null }),
    ]);

  type AssignmentQueryRow = {
    id: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    member_id: string;
    position_id: string;
    organization_period_id: string;
    members: { full_name: string; member_number: string | null };
    positions: { name: string; sort_order: number };
    organization_periods: {
      name: string;
      start_date: string;
      end_date: string;
    };
  };

  const rows =
    (assignmentsResult.data as unknown as AssignmentQueryRow[] | null) ?? [];

  // Diurutkan penugasan aktif dulu, lalu mengikuti urutan jabatan — sehingga
  // struktur terbaca dari Ketua ke bawah, bukan menurut waktu input.
  const assignments = rows
    .map((row) => ({
      id: row.id,
      memberId: row.member_id,
      memberName: row.members.full_name,
      positionId: row.position_id,
      positionName: row.positions.name,
      positionSortOrder: row.positions.sort_order,
      periodId: row.organization_period_id,
      periodName: row.organization_periods.name,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
    }))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "ACTIVE" ? -1 : 1;
      if (a.positionSortOrder !== b.positionSortOrder) {
        return a.positionSortOrder - b.positionSortOrder;
      }
      return a.memberName.localeCompare(b.memberName, "id");
    });

  return (
    <ManagementManager
      aksiTambahan={
        can(context, PERMISSIONS.management.export) ? (
          <ExportButton
            action={exportManagement.bind(null, context.organizationId)}
          />
        ) : undefined
      }
      organizationId={context.organizationId}
      assignments={assignments}
      periods={(periodsResult.data ?? []).map((period) => ({
        id: period.id,
        label: `${period.name} (${formatPeriodRange(period.start_date, period.end_date)})`,
      }))}
      members={(membersResult.data ?? []).map((member) => ({
        id: member.id,
        label: member.member_number
          ? `${member.full_name} · ${orDash(member.member_number)}`
          : member.full_name,
      }))}
      positions={(positionsResult.data ?? []).map((position) => ({
        id: position.id,
        label: position.name,
      }))}
      permissions={{
        canAssign,
        canEdit: can(context, PERMISSIONS.management.edit),
        canEnd: can(context, PERMISSIONS.management.end),
      }}
      daftar={{
        cari: daftar.cari,
        periode: daftar.saring.periode,
        jabatan: daftar.saring.jabatan,
        // Pilihan saringan berasal dari daftar yang SUDAH dimuat halaman
        // ini untuk formnya — bukan query tambahan. Bila pemanggil tidak
        // berhak menugaskan, daftarnya kosong dan saringannya tidak
        // dirender sama sekali.
        periodeOptions: (periodsResult.data ?? []).map((period) => ({
          value: period.id,
          label: period.name,
        })),
        jabatanOptions: (positionsResult.data ?? []).map((position) => ({
          value: position.id,
          label: position.name,
        })),
        halaman: daftar.halaman,
        total: assignmentsResult.count ?? 0,
        ukuranHalaman: UKURAN_HALAMAN,
      }}
    />
  );
}
