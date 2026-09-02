"use server";

import { revalidatePath } from "next/cache";

import {
  CREATE_ORGANIZATION_FIELDS,
  UPDATE_ORGANIZATION_FIELDS,
  createOrganizationSchema,
  updateOrganizationSchema,
} from "@/features/organizations/schemas/organization.schema";
import {
  requireAccessContext,
  requireOrganizationPermission,
} from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ForbiddenError, fail, ok, type ActionResult } from "@/lib/errors";
import { databaseFailure, parseForm } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

/**
 * Membuat organisasi baru.
 *
 * Ini aksi tingkat platform: `organization.create` hanya dimiliki role global,
 * sehingga tidak ada organization context untuk disandarkan. Otorisasinya
 * diperiksa terhadap permission global, lalu RLS memeriksanya lagi.
 */
export async function createOrganization(
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireAccessContext(null);

    if (!context.permissions.has(PERMISSIONS.organization.create)) {
      throw new ForbiddenError("missing_permission:organization.create");
    }

    const parsed = parseForm(
      createOrganizationSchema,
      formData,
      CREATE_ORGANIZATION_FIELDS,
    );
    if (!parsed.ok) return parsed.result;

    const input = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("organizations")
      .insert({
        name: input.name,
        short_name: input.shortName,
        slug: input.slug,
        organization_type_id: input.organizationTypeId,
        organization_level_id: input.organizationLevelId,
        parent_organization_id: input.parentOrganizationId,
        address: input.address,
        village: input.village,
        district: input.district,
        city_regency: input.cityRegency,
        province: input.province,
        email: input.email,
        phone: input.phone,
        description: input.description,
      })
      .select("id")
      .single();

    if (error) {
      return databaseFailure(error, {
        "23505": {
          success: false,
          error: "Slug sudah dipakai organisasi lain.",
          kind: "CONFLICT",
          fieldErrors: { slug: ["Slug sudah dipakai"] },
        },
      });
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: data.id,
      action: "organization.created",
      resourceType: "organization",
      resourceId: data.id,
      metadata: { slug: input.slug },
    });

    revalidatePath("/admin/organisasi");

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Mengubah data dasar organisasi yang sedang aktif.
 *
 * Organisasi target berasal dari access context, bukan dari form — jadi
 * memodifikasi payload tidak dapat mengarahkan perubahan ke tenant lain.
 */
export async function updateOrganization(
  organizationId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.organization.edit,
    );

    const parsed = parseForm(
      updateOrganizationSchema,
      formData,
      UPDATE_ORGANIZATION_FIELDS,
    );
    if (!parsed.ok) return parsed.result;

    const input = parsed.data;
    const supabase = await createClient();

    const { error } = await supabase
      .from("organizations")
      .update({
        name: input.name,
        short_name: input.shortName,
        address: input.address,
        village: input.village,
        district: input.district,
        city_regency: input.cityRegency,
        province: input.province,
        email: input.email,
        phone: input.phone,
        description: input.description,
      })
      .eq("id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "organization.updated",
      resourceType: "organization",
      resourceId: context.organizationId,
    });

    revalidatePath("/organisasi");
    revalidatePath("/admin/organisasi");
    revalidatePath("/", "layout");

    return ok();
  } catch (error) {
    return fail(error);
  }
}
