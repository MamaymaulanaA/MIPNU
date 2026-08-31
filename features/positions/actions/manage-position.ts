"use server";

import { revalidatePath } from "next/cache";

import {
  POSITION_FIELDS,
  positionSchema,
} from "@/features/positions/schemas/position.schema";
import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AppError, fail, ok, type ActionResult } from "@/lib/errors";
import { databaseFailure, formValues, parseForm } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

export async function createPosition(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.positions.create,
    );

    const parsed = parseForm(positionSchema, formData, POSITION_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("positions")
      .insert({
        organization_id: context.organizationId!,
        name: parsed.data.name,
        code: parsed.data.code,
        description: parsed.data.description,
        sort_order: parsed.data.sortOrder,
        parent_position_id: parsed.data.parentPositionId,
      })
      .select("id")
      .single();

    if (error) {
      return databaseFailure(error, {
        "23505": {
          success: false,
          error: "Jabatan dengan nama tersebut sudah ada.",
          kind: "CONFLICT",
          fieldErrors: { name: ["Nama jabatan sudah dipakai"] },
        },
      });
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "position.created",
      resourceType: "position",
      resourceId: data.id,
      metadata: { name: parsed.data.name },
    });

    revalidatePath("/organisasi/jabatan");

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updatePosition(
  organizationId: string,
  positionId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.positions.edit,
    );

    const parsed = parseForm(positionSchema, formData, POSITION_FIELDS);
    if (!parsed.ok) return parsed.result;

    // Jabatan tidak boleh menjadi induk dirinya sendiri. Database sudah
    // menolaknya lewat CHECK, tetapi ditangkap di sini agar pesannya jatuh
    // di field yang benar.
    if (parsed.data.parentPositionId === positionId) {
      return {
        success: false,
        error: "Periksa kembali isian Anda.",
        kind: "VALIDATION",
        fieldErrors: {
          parentPositionId: [
            "Jabatan tidak dapat menjadi induk dirinya sendiri",
          ],
        },
      };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("positions")
      .update({
        name: parsed.data.name,
        code: parsed.data.code,
        description: parsed.data.description,
        sort_order: parsed.data.sortOrder,
        parent_position_id: parsed.data.parentPositionId,
      })
      .eq("id", positionId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "position.updated",
      resourceType: "position",
      resourceId: positionId,
    });

    revalidatePath("/organisasi/jabatan");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function deletePosition(
  organizationId: string,
  positionId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.positions.delete,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("positions")
      .delete()
      .eq("id", positionId)
      .eq("organization_id", context.organizationId!);

    if (error) {
      // FK ke management_assignments memakai ON DELETE RESTRICT: jabatan yang
      // pernah dipakai tidak boleh lenyap, karena riwayat kepengurusan
      // menunjuk padanya.
      return databaseFailure(error, {
        "23503": {
          success: false,
          error:
            "Jabatan ini sudah pernah dipakai pada kepengurusan, jadi tidak dapat dihapus. Nonaktifkan saja agar riwayatnya tetap utuh.",
          kind: "CONFLICT",
        },
      });
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "position.deleted",
      resourceType: "position",
      resourceId: positionId,
    });

    revalidatePath("/organisasi/jabatan");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Menyetel permission sebuah jabatan.
 *
 * Ini yang membuat "Bendahara boleh mengelola keuangan" menjadi nyata tanpa
 * membuat BENDAHARA sebagai role sistem (PRD §11).
 *
 * Permission ber-scope platform ditolak database
 * (`app_private.reject_platform_permission`), sehingga pengelola organisasi
 * tidak dapat menaikkan dirinya ke wewenang platform lewat jabatan.
 */
export async function setPositionPermissions(
  organizationId: string,
  positionId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.positions.managePermissions,
    );

    const selected = formValues(formData, "permissionIds");
    const supabase = await createClient();

    // Pastikan jabatan memang milik organisasi aktif sebelum menyentuh
    // tabel anaknya. RLS sudah menjaga, tetapi ini membuat kegagalannya
    // menjadi pesan yang jelas, bukan penghapusan yang tidak berpengaruh.
    const { data: position, error: positionError } = await supabase
      .from("positions")
      .select("id, name")
      .eq("id", positionId)
      .eq("organization_id", context.organizationId!)
      .maybeSingle();

    if (positionError) return databaseFailure(positionError);
    if (!position) {
      throw new AppError("NOT_FOUND", "Jabatan tidak ditemukan.");
    }

    const { error: deleteError } = await supabase
      .from("position_permissions")
      .delete()
      .eq("position_id", positionId);

    if (deleteError) return databaseFailure(deleteError);

    if (selected.length > 0) {
      const { error: insertError } = await supabase
        .from("position_permissions")
        .insert(
          selected.map((permissionId) => ({
            position_id: positionId,
            permission_id: permissionId,
          })),
        );

      if (insertError) {
        return databaseFailure(insertError, {
          "42501": {
            success: false,
            error:
              "Sebagian permission yang dipilih hanya dapat diberikan lewat role platform.",
            kind: "FORBIDDEN",
          },
        });
      }
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "position.permissions_changed",
      resourceType: "position",
      resourceId: positionId,
      // Perubahan permission wajib dapat diaudit (docs/PERMISSIONS.md §83).
      metadata: { position: position.name, permission_count: selected.length },
    });

    revalidatePath("/organisasi/jabatan");

    return ok();
  } catch (error) {
    return fail(error);
  }
}
