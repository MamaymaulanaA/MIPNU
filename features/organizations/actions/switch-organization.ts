"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  listAccessibleOrganizations,
  ORGANIZATION_COOKIE,
} from "@/lib/auth/context";
import { ForbiddenError, fail, ok, type ActionResult } from "@/lib/errors";

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
