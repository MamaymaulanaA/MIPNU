"use server";

import { revalidatePath } from "next/cache";

import {
  COMMITTEE_FIELDS,
  committeeSchema,
} from "@/features/events/schemas/event.schema";
import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { databaseFailure, formValues, parseForm } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

/**
 * Menunjuk panitia event.
 *
 * Panitia adalah special assignment yang terikat pada SATU event — bukan role
 * permanen dan bukan role global. Permission yang diberikan di sini hanya
 * berlaku untuk event tersebut (PRD §13, §28).
 */
export async function addCommitteeMember(
  organizationId: string,
  eventId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.events.assignCommittee,
    );

    const parsed = parseForm(committeeSchema, formData, COMMITTEE_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("event_committees")
      .insert({
        event_id: eventId,
        organization_id: organizationId,
        member_id: parsed.data.memberId,
        position_name: parsed.data.positionName,
        created_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) {
      return databaseFailure(error, {
        "23505": {
          success: false,
          error:
            "Anggota tersebut sudah memegang tugas panitia dengan nama itu.",
          kind: "CONFLICT",
        },
        "23503": {
          success: false,
          error: "Anggota tidak valid untuk event ini.",
          kind: "CONFLICT",
        },
      });
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId,
      action: "event.committee_assigned",
      resourceType: "event",
      resourceId: eventId,
      metadata: {
        member_id: parsed.data.memberId,
        position: parsed.data.positionName,
      },
    });

    revalidatePath(`/kegiatan/${eventId}`);

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function removeCommitteeMember(
  organizationId: string,
  eventId: string,
  committeeId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.events.assignCommittee,
    );

    const supabase = await createClient();

    // event_committee_permissions memakai ON DELETE CASCADE: permission
    // panitia ikut hilang bersama penugasannya, sebagaimana mestinya.
    const { error } = await supabase
      .from("event_committees")
      .delete()
      .eq("id", committeeId)
      .eq("event_id", eventId)
      .eq("organization_id", organizationId);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId,
      action: "event.committee_removed",
      resourceType: "event",
      resourceId: eventId,
      metadata: { committee_id: committeeId },
    });

    revalidatePath(`/kegiatan/${eventId}`);

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Menyetel permission seorang panitia.
 *
 * Permission ini scoped ke event: `app_private.has_event_permission()` hanya
 * mengakuinya bila event_id-nya sama. Panitia Event A tidak pernah memperoleh
 * akses ke Event B.
 *
 * Panitia tidak dapat mengatur permission dirinya sendiri — dijaga policy
 * `event_committee_permissions_write`, dan permission platform ditolak
 * trigger.
 */
export async function setCommitteePermissions(
  organizationId: string,
  eventId: string,
  committeeId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.events.assignCommittee,
    );

    const selected = formValues(formData, "permissionIds");
    const supabase = await createClient();

    const { error: deleteError } = await supabase
      .from("event_committee_permissions")
      .delete()
      .eq("event_committee_id", committeeId);

    if (deleteError) return databaseFailure(deleteError);

    if (selected.length > 0) {
      const { error: insertError } = await supabase
        .from("event_committee_permissions")
        .insert(
          selected.map((permissionId) => ({
            event_committee_id: committeeId,
            permission_id: permissionId,
          })),
        );

      if (insertError) {
        return databaseFailure(insertError, {
          "42501": {
            success: false,
            error:
              "Sebagian permission tidak dapat diberikan kepada panitia, atau Anda tidak dapat mengatur permission untuk diri sendiri.",
            kind: "FORBIDDEN",
          },
        });
      }
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId,
      action: "event.committee_permissions_changed",
      resourceType: "event",
      resourceId: eventId,
      metadata: {
        committee_id: committeeId,
        permission_count: selected.length,
      },
    });

    revalidatePath(`/kegiatan/${eventId}`);

    return ok();
  } catch (error) {
    return fail(error);
  }
}
