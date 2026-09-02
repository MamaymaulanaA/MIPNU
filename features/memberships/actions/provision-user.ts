"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  AppError,
  ForbiddenError,
  fail,
  ok,
  type ActionResult,
} from "@/lib/errors";
import { databaseFailure, parseForm } from "@/lib/form";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

const provisionSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi")
    .pipe(z.email("Format email tidak valid"))
    .transform((value) => value.toLowerCase()),

  displayName: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter"),

  roleId: z.uuid({ error: "Role wajib dipilih" }),

  memberId: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .refine(
      (value) => value === null || z.uuid().safeParse(value).success,
      "Anggota tidak valid",
    ),
});

const PROVISION_FIELDS = [
  "email",
  "displayName",
  "roleId",
  "memberId",
] as const;

export type ProvisionResult = {
  inviteLink: string | null;
  emailSent: boolean;
  accountExisted: boolean;
};

/**
 * Menyediakan akun untuk seorang anggota.
 *
 * USER != MEMBER dipertahankan: anggota tetap satu baris di `members`, dan
 * akun yang dibuat DITAUTKAN ke baris itu lewat
 * `organization_memberships.member_id` — bukan menduplikasi datanya
 * (docs/DATABASE.md §36, SYSTEM.md §20).
 *
 * Pembagian client di sini disengaja:
 *
 *   - Admin client hanya untuk yang memang tidak bisa dilakukan user biasa:
 *     membuat akun di Supabase Auth.
 *   - Membership ditulis dengan client user-scoped, sehingga RLS yang
 *     memutuskan apakah admin ini benar-benar boleh menautkan orang ke
 *     organisasi ini. Menulisnya dengan service role akan melewati satu-
 *     satunya pagar yang tidak dapat dilupakan.
 */
export async function provisionUser(
  organizationId: string,
  _previousState: ActionResult<ProvisionResult> | null,
  formData: FormData,
): Promise<ActionResult<ProvisionResult>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.users.create,
    );

    if (!context.permissions.has(PERMISSIONS.users.assignOrganization)) {
      throw new ForbiddenError("missing_permission:users.assign_organization");
    }

    const parsed = parseForm(provisionSchema, formData, PROVISION_FIELDS);
    if (!parsed.ok) return parsed.result;

    const input = parsed.data;
    const supabase = await createClient();

    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id, code, scope")
      .eq("id", input.roleId)
      .maybeSingle();

    if (roleError) return databaseFailure(roleError);
    if (!role || role.scope !== "ORGANIZATION") {
      return {
        success: false,
        error: "Role tersebut tidak dapat diberikan pada tingkat organisasi.",
        kind: "FORBIDDEN",
        fieldErrors: { roleId: ["Role tidak valid"] },
      };
    }

    // ---- Anggota: wajib milik organisasi ini dan belum tertaut ------------
    if (input.memberId) {
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("id", input.memberId)
        .eq("organization_id", context.organizationId!)
        .is("deleted_at", null)
        .maybeSingle();

      // RLS sudah menyaring lintas tenant; ini mengubah kegagalannya menjadi
      // pesan yang dapat ditindaklanjuti.
      if (!member) {
        return {
          success: false,
          error: "Anggota tidak ditemukan pada organisasi ini.",
          kind: "NOT_FOUND",
          fieldErrors: { memberId: ["Anggota tidak valid"] },
        };
      }

      const { data: alreadyLinked } = await supabase
        .from("organization_memberships")
        .select("id")
        .eq("member_id", input.memberId)
        .maybeSingle();

      if (alreadyLinked) {
        return {
          success: false,
          error: "Anggota tersebut sudah tertaut ke akun lain.",
          kind: "CONFLICT",
          fieldErrors: { memberId: ["Sudah tertaut ke akun lain"] },
        };
      }
    }

    const admin = createAdminClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
      "http://localhost:3000";
    const redirectTo = `${siteUrl}/auth/konfirmasi`;

    let authUserId: string | null = null;
    let accountExisted = false;
    let emailSent = false;
    let inviteLink: string | null = null;

    const existing = await findAuthUserByEmail(admin, input.email);

    if (existing) {
      authUserId = existing.id;
      accountExisted = true;
    } else {
      const invited = await admin.auth.admin.inviteUserByEmail(input.email, {
        redirectTo,
        data: { display_name: input.displayName },
      });

      if (invited.data?.user) {
        authUserId = invited.data.user.id;
        emailSent = true;
      } else {
        const created = await admin.auth.admin.createUser({
          email: input.email,
          email_confirm: true,
          user_metadata: { display_name: input.displayName },
        });

        if (created.error || !created.data.user) {
          console.error(
            "[mipnu] gagal membuat akun",
            created.error?.message ?? "tidak diketahui",
          );
          throw new AppError(
            "INTERNAL",
            "Gagal membuat akun autentikasi. Periksa konfigurasi Supabase Auth.",
          );
        }

        authUserId = created.data.user.id;

        const link = await admin.auth.admin.generateLink({
          type: "recovery",
          email: input.email,
          options: { redirectTo },
        });

        inviteLink = recoveryLink(siteUrl, link.data?.properties?.hashed_token);
      }
    }

    if (!authUserId) {
      throw new AppError("INTERNAL", "Gagal menyiapkan akun autentikasi.");
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (!profile) {
      throw new AppError("INTERNAL", "Profile akun gagal disiapkan.");
    }

    // ---- Membership -------------------------------------------------------
    // Ditulis dengan client user-scoped: RLS memeriksa
    // users.assign_organization DAN menolak profile_id milik pemanggil
    // sendiri. Trigger menolak role ber-scope GLOBAL.
    const { error: membershipError } = await supabase
      .from("organization_memberships")
      .insert({
        organization_id: context.organizationId!,
        profile_id: profile.id,
        member_id: input.memberId,
        role_id: input.roleId,
        created_by: context.profileId,
      });

    if (membershipError) {
      return databaseFailure(membershipError, {
        "23505": {
          success: false,
          error: "Akun tersebut sudah memiliki akses ke organisasi ini.",
          kind: "CONFLICT",
          fieldErrors: { email: ["Sudah menjadi pengguna organisasi ini"] },
        },
        "42501": {
          success: false,
          error: "Anda tidak berhak menautkan pengguna ke organisasi ini.",
          kind: "FORBIDDEN",
        },
      });
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "user.provisioned",
      resourceType: "organization_membership",
      resourceId: profile.id,
      metadata: {
        email: input.email,
        role: role.code,
        linked_member: Boolean(input.memberId),
        account_existed: accountExisted,
      },
    });

    revalidatePath("/pengguna");

    return ok({ inviteLink, emailSent, accountExisted });
  } catch (error) {
    return fail(error);
  }
}

async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
) {
  let page = 1;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data) return null;

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email,
    );
    if (match) return match;

    if (data.users.length < 200) return null;
    page += 1;
  }
}

function recoveryLink(siteUrl: string, hashedToken: string | undefined) {
  if (!hashedToken) return null;

  return `${siteUrl}/auth/konfirmasi?token_hash=${encodeURIComponent(
    hashedToken,
  )}&type=recovery`;
}

export async function resendInvitation(
  organizationId: string,
  membershipId: string,
): Promise<ActionResult<{ inviteLink: string | null; emailSent: boolean }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.users.resetAccess,
    );

    const supabase = await createClient();

    const { data: membership } = await supabase
      .from("organization_memberships")
      .select(
        "id, profile_id, profiles!organization_memberships_profile_id_fkey!inner ( auth_user_id )",
      )
      .eq("id", membershipId)
      .eq("organization_id", context.organizationId!)
      .maybeSingle();

    if (!membership) {
      return {
        success: false,
        error: "Pengguna tidak ditemukan pada organisasi ini.",
        kind: "NOT_FOUND",
      };
    }

    const authUserId = (
      membership as unknown as { profiles: { auth_user_id: string | null } }
    ).profiles.auth_user_id;

    if (!authUserId) {
      return {
        success: false,
        error: "Akun autentikasi pengguna ini sudah tidak ada.",
        kind: "NOT_FOUND",
      };
    }

    const admin = createAdminClient();
    const { data: authUser } = await admin.auth.admin.getUserById(authUserId);

    if (!authUser?.user?.email) {
      return {
        success: false,
        error: "Email akun tidak ditemukan.",
        kind: "NOT_FOUND",
      };
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
      "http://localhost:3000";

    const link = await admin.auth.admin.generateLink({
      type: "recovery",
      email: authUser.user.email,
      options: { redirectTo: `${siteUrl}/auth/konfirmasi` },
    });

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "user.invitation_resent",
      resourceType: "organization_membership",
      resourceId: membershipId,
    });

    return ok({
      inviteLink: recoveryLink(siteUrl, link.data?.properties?.hashed_token),
      emailSent: false,
    });
  } catch (error) {
    return fail(error);
  }
}
