import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
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

export default async function UsersPage() {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.users.view)) {
    return <ForbiddenState />;
  }

  const supabase = await createClient();
  const canEdit = can(context, PERMISSIONS.users.edit);
  const canProvision =
    can(context, PERMISSIONS.users.create) &&
    can(context, PERMISSIONS.users.assignOrganization);

  const [membershipsResult, rolesResult, membersResult] = await Promise.all([
    supabase
      .from("organization_memberships")
      .select(
        `
        id, profile_id, role_id, status, joined_at, member_id,
        profiles!organization_memberships_profile_id_fkey!inner ( display_name ),
        roles!inner ( code, name ),
        members ( full_name, member_number )
      `,
      )
      .eq("organization_id", context.organizationId)
      .order("joined_at", { ascending: false }),

    // Hanya role ber-scope ORGANIZATION yang dapat diberikan di sini.
    // SUPER_ADMIN ber-scope GLOBAL dan ditolak trigger database.
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

  // Anggota yang belum punya akun — itulah yang masuk akal untuk dibuatkan.
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
        <MembershipTable
          organizationId={context.organizationId}
          memberships={memberships}
          roleOptions={rolesResult.data ?? []}
          memberOptions={memberOptions}
          currentProfileId={context.profileId}
          canEdit={canEdit}
        />
      </Card>
    </div>
  );
}
