import type { Metadata } from "next";

import { ForbiddenState } from "@/components/feedback/states";
import { PositionManager } from "@/features/positions/components/position-manager";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { bacaParamDaftar, polaCariOr } from "@/lib/list-params";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Jabatan",
};

const UKURAN_HALAMAN = 20;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PositionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.positions.view)) {
    return <ForbiddenState />;
  }

  const daftar = bacaParamDaftar(await searchParams, {
    ukuranHalaman: UKURAN_HALAMAN,
  });

  const supabase = await createClient();
  const canManagePermissions = can(
    context,
    PERMISSIONS.positions.managePermissions,
  );

  let daftarQuery = supabase
    .from("positions")
    .select(
      `
        id, name, code, description, sort_order, parent_position_id,
        position_permissions ( permission_id )
      `,
      { count: "exact" },
    )
    .eq("organization_id", context.organizationId);

  if (daftar.cari) {
    const aman = polaCariOr(daftar.cari);
    if (aman)
      daftarQuery = daftarQuery.or(`name.ilike.%${aman}%,code.ilike.%${aman}%`);
  }

  const [positionsResult, catalogResult] = await Promise.all([
    daftarQuery
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .range(daftar.dari, daftar.sampai),

    canManagePermissions
      ? supabase
          .from("permissions")
          .select("id, code, resource, description")
          .eq("is_platform", false)
          .order("resource")
          .order("code")
      : Promise.resolve({ data: [] as never[] }),
  ]);

  type PositionQueryRow = {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    sort_order: number;
    parent_position_id: string | null;
    position_permissions: { permission_id: string }[];
  };

  const rows =
    (positionsResult.data as unknown as PositionQueryRow[] | null) ?? [];
  const nameById = new Map(rows.map((row) => [row.id, row.name]));

  return (
    <PositionManager
      organizationId={context.organizationId}
      positions={rows.map((row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description,
        sortOrder: row.sort_order,
        parentPositionId: row.parent_position_id,
        parentName: row.parent_position_id
          ? (nameById.get(row.parent_position_id) ?? null)
          : null,
        permissionIds: row.position_permissions.map(
          (entry) => entry.permission_id,
        ),
      }))}
      permissionCatalog={catalogResult.data ?? []}
      permissions={{
        canCreate: can(context, PERMISSIONS.positions.create),
        canEdit: can(context, PERMISSIONS.positions.edit),
        canDelete: can(context, PERMISSIONS.positions.delete),
        canManagePermissions,
      }}
      daftar={{
        cari: daftar.cari,
        halaman: daftar.halaman,
        total: positionsResult.count ?? 0,
        ukuranHalaman: UKURAN_HALAMAN,
      }}
    />
  );
}
