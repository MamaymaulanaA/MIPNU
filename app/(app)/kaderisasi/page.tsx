import type { Metadata } from "next";

import { ForbiddenState } from "@/components/feedback/states";
import { exportCadreship } from "@/features/exports/actions/export-csv";
import { ExportButton } from "@/features/exports/components/export-button";
import {
  CadreshipManager,
  type CadreshipRow,
} from "@/features/cadreship/components/cadreship-manager";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { bacaParamDaftar, polaCari } from "@/lib/list-params";
import { CADRESHIP_STATUSES } from "@/features/cadreship/schemas/cadreship.schema";
import { cadreshipStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Kaderisasi",
};

/**
 * Satu halaman, dua pembaca.
 *
 * Pemegang cadreship.view melihat riwayat seluruh anggota; anggota biasa
 * hanya melihat riwayatnya sendiri. Perbedaannya TIDAK dikerjakan di sini —
 * policy `cadreship_records_select` yang menyaringnya. Halaman ini hanya
 * menyesuaikan tampilan terhadap apa yang lolos, sehingga tidak ada dua
 * pendapat tentang siapa boleh melihat apa.
 */
const UKURAN_HALAMAN = 20;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CadreshipPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await requireAccessContext();

  const canViewAll = can(context, PERMISSIONS.cadreship.view);
  const canViewOwn = can(context, PERMISSIONS.cadreship.viewOwn);

  if (!context.organizationId || (!canViewAll && !canViewOwn)) {
    return <ForbiddenState />;
  }

  const daftar = bacaParamDaftar(await searchParams, {
    ukuranHalaman: UKURAN_HALAMAN,
    kunciSaring: ["jenjang", "status"],
  });

  const supabase = await createClient();

  const [recordsResult, typesResult, membersResult] = await Promise.all([
    supabase
      .from("cadreship_records")
      .select(
        `
        id, member_id, cadreship_type_id, activity_name, organizer, location,
        start_date, end_date, status, certificate_number, notes,
        members!cadreship_records_member_fk ( full_name, member_number ),
        cadreship_types!inner ( name )
      `,
        { count: "exact" },
      )
      .eq("organization_id", context.organizationId)
      .is("deleted_at", null)
      .match(
        Object.fromEntries(
          [
            daftar.saring.jenjang
              ? ["cadreship_type_id", daftar.saring.jenjang]
              : null,
            daftar.saring.status ? ["status", daftar.saring.status] : null,
          ].filter(Boolean) as [string, string][],
        ),
      )
      .ilike("activity_name", daftar.cari ? polaCari(daftar.cari) : "%")
      .order("start_date", { ascending: false, nullsFirst: false })
      .range(daftar.dari, daftar.sampai),

    supabase
      .from("cadreship_types")
      .select("id, code, name, level_order")
      .eq("is_active", true)
      .order("level_order", { ascending: true, nullsFirst: false }),

    canViewAll
      ? supabase
          .from("members")
          .select("id, full_name, member_number")
          .eq("organization_id", context.organizationId)
          .is("deleted_at", null)
          .order("full_name")
      : Promise.resolve({ data: [] as never[] }),
  ]);

  type RecordRow = {
    id: string;
    member_id: string;
    cadreship_type_id: string;
    activity_name: string;
    organizer: string | null;
    location: string | null;
    start_date: string | null;
    end_date: string | null;
    status: string;
    certificate_number: string | null;
    notes: string | null;
    members: { full_name: string; member_number: string | null } | null;
    cadreship_types: { name: string };
  };

  const records: CadreshipRow[] = (
    (recordsResult.data as unknown as RecordRow[] | null) ?? []
  ).map((row) => ({
    id: row.id,
    memberId: row.member_id,
    memberName: row.members?.full_name ?? "—",
    memberNumber: row.members?.member_number ?? null,
    typeId: row.cadreship_type_id,
    typeName: row.cadreship_types.name,
    activityName: row.activity_name,
    organizer: row.organizer,
    location: row.location,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    certificateNumber: row.certificate_number,
    notes: row.notes,
  }));

  return (
    <CadreshipManager
      aksiTambahan={
        can(context, PERMISSIONS.cadreship.export) ? (
          <ExportButton
            action={exportCadreship.bind(null, context.organizationId, {})}
          />
        ) : undefined
      }
      organizationId={context.organizationId}
      records={records}
      ownOnly={!canViewAll}
      memberOptions={(
        (membersResult.data as
          | { id: string; full_name: string; member_number: string | null }[]
          | null) ?? []
      ).map((member) => ({
        id: member.id,
        label: member.member_number
          ? `${member.full_name} · ${member.member_number}`
          : member.full_name,
      }))}
      typeOptions={(
        (typesResult.data as { id: string; name: string }[] | null) ?? []
      ).map((type) => ({ id: type.id, label: type.name }))}
      permissions={{
        canCreate: can(context, PERMISSIONS.cadreship.create),
        canEdit: can(context, PERMISSIONS.cadreship.edit),
        canVerify: can(context, PERMISSIONS.cadreship.verify),
        canDelete: can(context, PERMISSIONS.cadreship.delete),
      }}
      daftar={{
        cari: daftar.cari,
        jenjang: daftar.saring.jenjang,
        status: daftar.saring.status,
        // Pilihan jenjang berasal dari katalog yang SUDAH dimuat halaman ini
        // untuk formnya — bukan query tambahan.
        jenjangOptions: (
          (typesResult.data as { id: string; name: string }[] | null) ?? []
        ).map((type) => ({ value: type.id, label: type.name })),
        statusOptions: CADRESHIP_STATUSES.map((status) => ({
          value: status,
          label: cadreshipStatus(status).label,
        })),
        halaman: daftar.halaman,
        total: recordsResult.count ?? 0,
        ukuranHalaman: UKURAN_HALAMAN,
      }}
    />
  );
}
