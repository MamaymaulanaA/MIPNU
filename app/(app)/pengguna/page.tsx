import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/data-table/pagination";
import { TableToolbar } from "@/components/data-table/toolbar";
import { ForbiddenState } from "@/components/feedback/states";
import { Card } from "@/components/ui/card";
import { MembershipTable } from "@/features/memberships/components/membership-table";
import { ProvisionUserDialog } from "@/features/memberships/components/provision-user-dialog";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pengguna",
};

const UKURAN_HALAMAN = 20;

const STATUS_MEMBERSHIP = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "INACTIVE", label: "Tidak aktif" },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function satuNilai(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.users.view)) {
    return <ForbiddenState />;
  }

  const params = await searchParams;
  const cari = satuNilai(params.search).trim();
  const peran = satuNilai(params.peran);
  const status = satuNilai(params.status);
  const halaman = Math.max(1, Number(satuNilai(params.page)) || 1);
  const dari = (halaman - 1) * UKURAN_HALAMAN;

  const supabase = await createClient();
  const canEdit = can(context, PERMISSIONS.users.edit);
  const canProvision =
    can(context, PERMISSIONS.users.create) &&
    can(context, PERMISSIONS.users.assignOrganization);

  let daftarQuery = supabase
    .from("organization_memberships")
    .select(
      `
        id, profile_id, role_id, status, joined_at, member_id,
        profiles!organization_memberships_profile_id_fkey!inner ( display_name ),
        roles!inner ( code, name ),
        members ( full_name, member_number )
      `,
      { count: "exact" },
    )
    .eq("organization_id", context.organizationId);

  if (peran) daftarQuery = daftarQuery.eq("role_id", peran);
  if (status) daftarQuery = daftarQuery.eq("status", status);
  if (cari) {
    daftarQuery = daftarQuery.ilike(
      "profiles.display_name",
      `%${cari.replace(/[%_]/g, "\$&")}%`,
    );
  }

  const [membershipsResult, rolesResult, membersResult] = await Promise.all([
    daftarQuery
      .order("joined_at", { ascending: false })
      .order("id", { ascending: true })
      .range(dari, dari + UKURAN_HALAMAN - 1),

    canEdit || canProvision
      ? supabase
          .from("roles")
          .select("id, code, name")
          .eq("scope", "ORGANIZATION")
          .order("code")
      : Promise.resolve({ data: null }),

    canEdit || canProvision
      ? supabase
          .from("members")
          .select("id, full_name, member_number")
          .eq("organization_id", context.organizationId)
          .is("deleted_at", null)
          .order("full_name")
      : Promise.resolve({ data: null }),
  ]);

  type MembershipQueryRow = {
    id: string;
    profile_id: string;
    role_id: string;
    status: string;
    joined_at: string;
    member_id: string | null;
    profiles: { display_name: string };
    roles: { code: string; name: string };
    members: { full_name: string; member_number: string | null } | null;
  };

  const memberships = (
    (membershipsResult.data as unknown as MembershipQueryRow[] | null) ?? []
  ).map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    displayName: row.profiles.display_name,
    roleId: row.role_id,
    roleCode: row.roles.code,
    status: row.status,
    joinedAt: row.joined_at,
    memberId: row.member_id,
    memberName: row.members?.full_name ?? null,
  }));

  const linkedMemberIds = new Set(
    memberships.map((membership) => membership.memberId).filter(Boolean),
  );

  const memberOptions = (membersResult.data ?? []).map((member) => ({
    id: member.id,
    label: member.member_number
      ? `${member.full_name} · ${member.member_number}`
      : member.full_name,
  }));

  const unlinkedMembers = memberOptions.filter(
    (member) => !linkedMemberIds.has(member.id),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengguna"
        description="Akun yang memiliki akses ke organisasi ini. Akun berbeda dari data anggota."
        actions={
          canProvision ? (
            <ProvisionUserDialog
              organizationId={context.organizationId}
              roleOptions={rolesResult.data ?? []}
              unlinkedMembers={unlinkedMembers}
            />
          ) : undefined
        }
      />

      <Card>
        <TableToolbar
          searchValue={cari}
          searchPlaceholder="Cari nama akun…"
          searchLabel="Cari pengguna"
          filters={[
            {
              key: "peran",
              label: "Saring menurut role",
              value: peran,
              allLabel: "Semua role",
              options: (rolesResult.data ?? []).map((role) => ({
                value: role.id,
                label: role.name,
              })),
            },
            {
              key: "status",
              label: "Saring menurut status",
              value: status,
              allLabel: "Semua status",
              options: STATUS_MEMBERSHIP,
            },
          ]}
        />

        <MembershipTable
          organizationId={context.organizationId}
          memberships={memberships}
          roleOptions={rolesResult.data ?? []}
          memberOptions={memberOptions}
          currentProfileId={context.profileId}
          canEdit={canEdit}
        />

        <Pagination
          page={halaman}
          pageCount={Math.max(
            1,
            Math.ceil((membershipsResult.count ?? 0) / UKURAN_HALAMAN),
          )}
          total={membershipsResult.count ?? 0}
          pageSize={UKURAN_HALAMAN}
        />
      </Card>
    </div>
  );
}
