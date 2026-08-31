"use server";

import { revalidatePath } from "next/cache";

import {
  AGENDA_FIELDS,
  agendaSchema,
} from "@/features/agenda/schemas/agenda.schema";
import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { databaseFailure, parseForm } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

export async function createAgendaItem(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.agenda.create,
    );

    const parsed = parseForm(agendaSchema, formData, AGENDA_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("agenda_items")
      .insert({
        organization_id: context.organizationId!,
        title: parsed.data.title,
        description: parsed.data.description,
        agenda_type: parsed.data.agendaType,
        start_at: new Date(parsed.data.startAt).toISOString(),
        end_at: parsed.data.endAt
          ? new Date(parsed.data.endAt).toISOString()
          : null,
        location: parsed.data.location,
        visibility: parsed.data.visibility,
        created_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "agenda.created",
      resourceType: "agenda_item",
      resourceId: data.id,
    });

    revalidatePath("/agenda");
    revalidatePath("/dashboard");

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateAgendaItem(
  organizationId: string,
  agendaId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.agenda.edit,
    );

    const parsed = parseForm(agendaSchema, formData, AGENDA_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { error } = await supabase
      .from("agenda_items")
      .update({
        title: parsed.data.title,
        description: parsed.data.description,
        agenda_type: parsed.data.agendaType,
        start_at: new Date(parsed.data.startAt).toISOString(),
        end_at: parsed.data.endAt
          ? new Date(parsed.data.endAt).toISOString()
          : null,
        location: parsed.data.location,
        visibility: parsed.data.visibility,
      })
      .eq("id", agendaId)
      .eq("organization_id", context.organizationId!)
      .is("deleted_at", null);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "agenda.updated",
      resourceType: "agenda_item",
      resourceId: agendaId,
    });

    revalidatePath("/agenda");
    revalidatePath("/dashboard");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/** Soft delete — agenda lampau tetap menjadi bagian riwayat organisasi. */
export async function deleteAgendaItem(
  organizationId: string,
  agendaId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.agenda.delete,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("agenda_items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", agendaId)
      .eq("organization_id", context.organizationId!)
      .is("deleted_at", null);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "agenda.deleted",
      resourceType: "agenda_item",
      resourceId: agendaId,
    });

    revalidatePath("/agenda");
    revalidatePath("/dashboard");

    return ok();
  } catch (error) {
    return fail(error);
  }
}
