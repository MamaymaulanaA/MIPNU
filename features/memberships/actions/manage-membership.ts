"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { databaseFailure } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

export async function changeMembershipRole(
  organizationId: string,
  membershipId: string,
  roleId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.users.edit,
    );

    const supabase = await createClient();

    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id, code, scope")
      .eq("id", roleId)
      .maybeSingle();

    if (roleError) return databaseFailure(roleError);

    if (!role || role.scope !== "ORGANIZATION") {
      return {
        success: false,
        error: "Role tersebut tidak dapat diberikan pada tingkat organisasi.",
        kind: "FORBIDDEN",
      };
    }

    const { error } = await supabase
      .from("organization_memberships")
      .update({ role_id: roleId })
      .eq("id", membershipId)
      .eq("organization_id", organizationId);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId,
      action: "membership.role_changed",
      resourceType: "organization_membership",
      resourceId: membershipId,
      metadata: { role: role.code },
    });

    revalidatePath("/pengguna");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Mengakhiri akses seseorang ke organisasi.
 *
 * Bukan DELETE: membership yang dihapus akan menghilangkan jejak siapa pernah
 * punya akses ke apa. Statusnya berubah menjadi ENDED dan `ended_at` diisi
 * (docs/RLS.md §30).
 */
export async function endMembership(
  organizationId: string,
  membershipId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.users.edit,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("organization_memberships")
      .update({ status: "ENDED", ended_at: new Date().toISOString() })
      .eq("id", membershipId)
      .eq("organization_id", organizationId)
      .eq("status", "ACTIVE");

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId,
      action: "membership.ended",
      resourceType: "organization_membership",
      resourceId: membershipId,
    });

    revalidatePath("/pengguna");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function linkMembershipToMember(
  organizationId: string,
  membershipId: string,
  memberId: string | null,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.users.edit,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("organization_memberships")
      .update({ member_id: memberId })
      .eq("id", membershipId)
      .eq("organization_id", organizationId);

    if (error) {
      return databaseFailure(error, {
        "23505": {
          success: false,
          error: "Data anggota tersebut sudah tertaut ke akun lain.",
          kind: "CONFLICT",
        },
        "23503": {
          success: false,
          error: "Anggota tidak valid untuk organisasi ini.",
          kind: "CONFLICT",
        },
      });
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId,
      action: "membership.member_linked",
      resourceType: "organization_membership",
      resourceId: membershipId,
      metadata: { member_id: memberId },
    });

    revalidatePath("/pengguna");

    return ok();
  } catch (error) {
    return fail(error);
  }
}
