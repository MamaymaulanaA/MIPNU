"use server";

import { revalidatePath } from "next/cache";

import {
  ASSIGNMENT_FIELDS,
  assignmentSchema,
} from "@/features/management/schemas/assignment.schema";
import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { databaseFailure, parseForm } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

/**
 * Menugaskan anggota pada sebuah jabatan di sebuah periode.
 *
 * Penugasan inilah yang menghidupkan permission jabatan bagi orang tersebut —
 * karena itu ia diaudit, dan `management.assign` dipisahkan dari
 * `management.view`.
 */
export async function createAssignment(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.management.assign,
    );

    const parsed = parseForm(assignmentSchema, formData, ASSIGNMENT_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("management_assignments")
      .insert({
        organization_id: context.organizationId!,
        organization_period_id: parsed.data.organizationPeriodId,
        member_id: parsed.data.memberId,
        position_id: parsed.data.positionId,
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate,
        status: "ACTIVE",
        appointed_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) {
      return databaseFailure(error, {
        "23505": {
          success: false,
          error:
            "Anggota tersebut sudah ditugaskan pada jabatan yang sama di periode ini.",
          kind: "CONFLICT",
        },
        // Composite FK gagal berarti periode/anggota/jabatan yang dipilih
        // bukan milik organisasi ini — upaya lintas tenant, bukan salah ketik.
        "23503": {
          success: false,
          error:
            "Periode, anggota, atau jabatan tidak valid untuk organisasi ini.",
          kind: "CONFLICT",
        },
      });
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "management.assigned",
      resourceType: "management_assignment",
      resourceId: data.id,
      metadata: { position_id: parsed.data.positionId },
    });

    revalidatePath("/organisasi/kepengurusan");

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateAssignment(
  organizationId: string,
  assignmentId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.management.edit,
    );

    const parsed = parseForm(assignmentSchema, formData, ASSIGNMENT_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { error } = await supabase
      .from("management_assignments")
      .update({
        organization_period_id: parsed.data.organizationPeriodId,
        member_id: parsed.data.memberId,
        position_id: parsed.data.positionId,
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate,
      })
      .eq("id", assignmentId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "management.updated",
      resourceType: "management_assignment",
      resourceId: assignmentId,
    });

    revalidatePath("/organisasi/kepengurusan");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Mengakhiri penugasan.
 *
 * Bukan DELETE: riwayat kepengurusan harus tetap terbaca setelah periode
 * berganti (docs/DATABASE.md §50). Statusnya berubah, barisnya tetap.
 */
export async function endAssignment(
  organizationId: string,
  assignmentId: string,
  outcome: "ENDED" | "REVOKED",
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.management.end,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("management_assignments")
      .update({
        status: outcome,
        end_date: new Date().toISOString().slice(0, 10),
      })
      .eq("id", assignmentId)
      .eq("organization_id", context.organizationId!)
      .eq("status", "ACTIVE");

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: outcome === "REVOKED" ? "management.revoked" : "management.ended",
      resourceType: "management_assignment",
      resourceId: assignmentId,
    });

    revalidatePath("/organisasi/kepengurusan");
    revalidatePath("/dashboard");

    return ok();
  } catch (error) {
    return fail(error);
  }
}
