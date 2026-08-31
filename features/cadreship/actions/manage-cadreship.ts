"use server";

import { revalidatePath } from "next/cache";

import {
  CADRESHIP_FIELDS,
  cadreshipRecordSchema,
} from "@/features/cadreship/schemas/cadreship.schema";
import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { databaseFailure, parseForm } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

/**
 * Riwayat kaderisasi.
 *
 * Tiap penempuhan adalah BARIS BARU, bukan pembaruan satu kolom jenjang pada
 * anggota. Seorang kader yang mengulang LAKMUD punya dua baris, dan yang
 * pertama tetap terbaca — termasuk ketika hasilnya tidak lulus.
 */
export async function createCadreshipRecord(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.cadreship.create,
    );

    const parsed = parseForm(cadreshipRecordSchema, formData, CADRESHIP_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("cadreship_records")
      .insert({
        organization_id: context.organizationId!,
        member_id: parsed.data.memberId,
        cadreship_type_id: parsed.data.cadreshipTypeId,
        activity_name: parsed.data.activityName,
        organizer: parsed.data.organizer,
        location: parsed.data.location,
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate,
        status: parsed.data.status,
        certificate_number: parsed.data.certificateNumber,
        notes: parsed.data.notes,
        created_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) {
      return databaseFailure(error, {
        "23503": {
          success: false,
          error: "Anggota atau jenjang tidak valid untuk organisasi ini.",
          kind: "CONFLICT",
        },
      });
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "cadreship.created",
      resourceType: "cadreship_record",
      resourceId: data.id,
      metadata: { status: parsed.data.status },
    });

    revalidatePath("/kaderisasi");

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateCadreshipRecord(
  organizationId: string,
  recordId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.cadreship.edit,
    );

    const parsed = parseForm(cadreshipRecordSchema, formData, CADRESHIP_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { error } = await supabase
      .from("cadreship_records")
      .update({
        member_id: parsed.data.memberId,
        cadreship_type_id: parsed.data.cadreshipTypeId,
        activity_name: parsed.data.activityName,
        organizer: parsed.data.organizer,
        location: parsed.data.location,
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate,
        status: parsed.data.status,
        certificate_number: parsed.data.certificateNumber,
        notes: parsed.data.notes,
      })
      .eq("id", recordId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "cadreship.updated",
      resourceType: "cadreship_record",
      resourceId: recordId,
      metadata: { status: parsed.data.status },
    });

    revalidatePath("/kaderisasi");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Memverifikasi kaderisasi.
 *
 * Aksi tersendiri, bukan nilai pada dropdown status. Permission-nya juga
 * tersendiri — dan penegakannya tidak berhenti di sini: trigger
 * `guard_cadreship_verification()` menolak perubahan kolom verifikasi dari
 * jalur mana pun yang tidak memegang cadreship.verify.
 */
export async function verifyCadreshipRecord(
  organizationId: string,
  recordId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.cadreship.verify,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("cadreship_records")
      .update({
        status: "VERIFIED",
        verified_by: context.profileId,
        verified_at: new Date().toISOString(),
      })
      .eq("id", recordId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "cadreship.verified",
      resourceType: "cadreship_record",
      resourceId: recordId,
    });

    revalidatePath("/kaderisasi");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function deleteCadreshipRecord(
  organizationId: string,
  recordId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.cadreship.delete,
    );

    const supabase = await createClient();

    // Soft delete: riwayat kaderisasi adalah bukti, dan bukti yang dapat
    // dihapus permanen oleh satu klik bukan bukti.
    const { error } = await supabase
      .from("cadreship_records")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", recordId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "cadreship.deleted",
      resourceType: "cadreship_record",
      resourceId: recordId,
    });

    revalidatePath("/kaderisasi");

    return ok();
  } catch (error) {
    return fail(error);
  }
}
