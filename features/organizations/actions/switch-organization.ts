"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  listAccessibleOrganizations,
  ORGANIZATION_COOKIE,
} from "@/lib/auth/context";
import { ForbiddenError, fail, ok, type ActionResult } from "@/lib/errors";

/**
 * Berpindah organisasi aktif.
 *
 * Organisasi tujuan diadu dengan daftar membership nyata SEBELUM cookie
 * ditulis. Tanpa langkah ini, seseorang cukup menyetel cookie ke UUID
 * organisasi lain untuk berpindah tenant.
 *
 * Cookie sendiri tetap bukan otorisasi — `resolveOrganizationId()` selalu
 * memvalidasinya ulang setiap request, dan RLS menutup lapisan terakhir.
 */
export async function switchOrganization(
  organizationId: string,
): Promise<ActionResult> {
  try {
    const organizations = await listAccessibleOrganizations();

    const target = organizations.find(
      (organization) => organization.organizationId === organizationId,
    );

    if (!target) {
      throw new ForbiddenError("organization_not_accessible");
    }

    const cookieStore = await cookies();
    cookieStore.set(ORGANIZATION_COOKIE, target.organizationId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    revalidatePath("/", "layout");

    return ok();
  } catch (error) {
    return fail(error);
  }
}
